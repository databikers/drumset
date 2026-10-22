import { QueueProcessorOptions } from '@options';
import { Executor, Facts, Middleware, NodeExecution, NodeMeta } from '@parameters';
import { FrameworkInterface } from '@framework';
import { Logger } from '@logger';
import { RoundRobinProxy } from '../node/round-robin-proxy';
import { Queue } from './queue';

/** One replica of a node: takes facts from the node's queue and runs middleware and handler on them. */
export class QueueProcessor<DataType, NodeName extends string> {
  protected readonly name: NodeName;
  private readonly index: number;
  protected readonly queue: Queue<DataType, NodeName>;
  protected readonly executor: Executor<DataType, NodeName>;
  protected readonly framework: FrameworkInterface<DataType, NodeName>;
  protected readonly middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;
  protected readonly rrProxy: RoundRobinProxy<DataType, NodeName>;
  protected readonly logger: Logger;
  protected readonly verbose: boolean;
  private running = true;
  private current: Promise<void> | null = null;

  constructor(options: QueueProcessorOptions<DataType, NodeName>) {
    this.name = options.name;
    this.index = options.index;
    this.queue = options.queue;
    this.executor = options.executor;
    this.framework = options.framework;
    this.middleware = options.middleware;
    this.rrProxy = options.rrProxy;
    this.logger = options.logger;
    this.verbose = options.verbose;
    this.loop().catch((error) => this.logger.log(`Node '${this.name}[${this.index}]' stopped on error`, error));
  }

  /** True while a handler is running. */
  public get busy(): boolean {
    return this.current !== null;
  }

  /** Resolves when the running handler (if any) is done. */
  public idle(): Promise<void> {
    return this.current || Promise.resolve();
  }

  public stopProcessing() {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.queue.wakeUp();
    if (this.verbose) {
      this.logger.log(`Stopped node '${this.name}[${this.index}]'`);
    }
  }

  private async loop() {
    while (this.running) {
      const item = this.queue.dequeue();
      if (!item) {
        if (!this.rrProxy.downScaled) {
          this.rrProxy.scalingDown();
        }
        await this.queue.waitForItem();
        continue;
      }
      this.current = this.handle(item);
      try {
        await this.current;
      } finally {
        this.current = null;
        if (!this.rrProxy.rebalanced) {
          this.rrProxy.scalingUp();
        }
      }
    }
  }

  protected async handle(item: Facts<DataType, NodeName>) {
    const { framework, name } = this;
    const { meta } = item;
    const execution = framework.execution(name, item);
    const now = Date.now();

    if (meta.expiresAt && meta.expiresAt < now) {
      const error = new Error(`Facts ${item.id} was expired`);
      execution.errors.push({ message: error.message, node: name, attempt: execution.attempts, at: now });
      execution.status = 'failed';
      item.inUse.delete(name);
      meta.status = 'expired';
      framework.exit(item, error);
      return;
    }
    if (meta.executeAfter && meta.executeAfter > now && name === meta.startNode && !execution.attempts) {
      execution.status = 'waiting';
      execution.nextAttemptAt = meta.executeAfter;
      framework.schedule(name, item, meta.executeAfter);
      return;
    }

    this.start(item, execution, now);
    const nodeMeta: Partial<NodeMeta> = framework.nodeMeta(name) || {};
    let routed = false;
    const succeed = () => this.finish(item, execution, 'succeeded');
    const fail = (error: Error) => {
      execution.errors.push({ message: error.message, node: name, attempt: execution.attempts, at: Date.now() });
      this.finish(item, execution, 'failed');
    };

    try {
      for (const middleware of this.middleware.get(name) || []) {
        await middleware(
          item.data,
          (node: NodeName | NodeName[]) => {
            routed = true;
            succeed();
            item.inUse.delete(name);
            item.processedNodes.add(name);
            framework.next(node, item);
          },
          (exitWith?: Error | NodeName | NodeName[]) => {
            routed = true;
            if (exitWith instanceof Error) {
              item.failedNodes.add(name);
              fail(exitWith);
            } else {
              succeed();
            }
            item.inUse.delete(name);
            framework.exit(item, exitWith);
          },
        );
        // A middleware that routed the fact ends this node: the handler does not run.
        if (routed) {
          return;
        }
      }
      await this.executor(
        item.data,
        (node: NodeName | NodeName[]) => {
          succeed();
          item.inUse.delete(name);
          item.processedNodes.add(name);
          if (nodeMeta.rollbackWhenSuccessNode) {
            item.rollbacks.add(nodeMeta.rollbackWhenSuccessNode as NodeName);
          }
          framework.next(node, item);
        },
        (exitWith?: Error | NodeName | NodeName[]) => {
          if (exitWith instanceof Error) {
            if (nodeMeta.rollbackWhenErrorNode) {
              item.activeCompensator.add(nodeMeta.rollbackWhenErrorNode as NodeName);
            }
            fail(exitWith);
          } else {
            succeed();
          }
          item.inUse.delete(name);
          framework.exit(item, exitWith);
        },
        (error?: Error) => {
          this.finish(item, execution, 'failed');
          framework.retry(name, item, error);
        },
        item.error,
      );
      if (item.rollbacks.has(name)) {
        item.processedNodes.add(name);
      }
      // Returned without next/exit/retry: the node is done.
      if (execution.status === 'running') {
        succeed();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (!item.error) {
        item.error = err;
      }
      item.nodeErrors[name] = err.message;
      this.finish(item, execution, 'failed');
      framework.retry(name, item, err);
    } finally {
      if (execution.status === 'succeeded' || execution.status === 'failed') {
        item.inUse.delete(name);
      }
      framework.settle(item);
    }
  }

  private start(item: Facts<DataType, NodeName>, execution: NodeExecution<NodeName>, now: number) {
    const { meta } = item;
    meta.currentNode = this.name;
    if (!meta.path.includes(this.name)) {
      meta.path.push(this.name);
    }
    if (!item.used) {
      meta.status = 'running';
    }
    execution.status = 'running';
    execution.attempts += 1;
    execution.startedAt = now;
    execution.finishedAt = undefined;
    execution.durationMs = undefined;
    execution.nextAttemptAt = undefined;
    execution.waitingFor = undefined;
    meta.updatedAt = now;
  }

  /** Closes the current attempt once; later calls (e.g. next() then return) are ignored. */
  private finish(item: Facts<DataType, NodeName>, execution: NodeExecution<NodeName>, status: 'succeeded' | 'failed') {
    if (execution.status !== 'running') {
      return;
    }
    const now = Date.now();
    execution.status = status;
    execution.finishedAt = now;
    execution.durationMs = now - (execution.startedAt || now);
    execution.totalDurationMs += execution.durationMs;
    item.meta.updatedAt = now;
  }
}
