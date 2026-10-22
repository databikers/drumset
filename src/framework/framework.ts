import { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY } from '@const';
import { FrameworkOptions } from '@options';
import { Facts, NodeExecution, NodeMeta } from '@parameters';
import { FrameworkInterface } from './framework-interface';

export class Framework<DataType, NodeName extends string> implements FrameworkInterface<DataType, NodeName> {
  protected options: FrameworkOptions<DataType, NodeName>;

  constructor(frameworkOptions: FrameworkOptions<DataType, NodeName>) {
    this.options = frameworkOptions;
  }

  public nodeMeta(node: NodeName): NodeMeta | undefined {
    return this.options.meta.get(node);
  }

  public execution(node: NodeName, facts: Facts<DataType, NodeName>): NodeExecution<NodeName> {
    const existing = facts.meta.nodes[node];
    if (existing) {
      return existing;
    }
    const nodeMeta = this.nodeMeta(node);
    // The start node takes the fact-level limit; other nodes use their own limit first.
    const maxRetries =
      node === facts.meta.startNode
        ? (facts.meta.maxRetries ?? nodeMeta?.retriesLimit ?? DEFAULT_MAX_RETRIES)
        : (nodeMeta?.retriesLimit ?? facts.meta.maxRetries ?? DEFAULT_MAX_RETRIES);
    const execution: NodeExecution<NodeName> = {
      node,
      status: 'queued',
      attempts: 0,
      retries: 0,
      maxRetries,
      retryDelay: nodeMeta?.timeoutBetweenRetries ?? DEFAULT_RETRY_DELAY,
      enqueuedAt: Date.now(),
      // Declared up front (undefined is left out of JSON) so serialized records keep this key order.
      startedAt: undefined,
      finishedAt: undefined,
      durationMs: undefined,
      totalDurationMs: 0,
      nextAttemptAt: undefined,
      waitingFor: undefined,
      errors: [],
    };
    facts.meta.nodes[node] = execution;
    return execution;
  }

  public next(node: NodeName | NodeName[], facts: Facts<DataType, NodeName>) {
    const nodes = (Array.isArray(node) ? node : [node]).filter((item: any) => typeof item === 'string' && item);
    if (!nodes.length) {
      return this.exit(facts, this.recordError(facts, new Error('next function requires a non-empty array/string')));
    }
    for (const n of nodes) {
      if (!this.options.nodes.has(n)) {
        return this.exit(facts, this.recordError(facts, new Error(`Node ${n} doesn't exist`)));
      }
      if (
        facts.processedNodes.has(n) ||
        (facts.used && !facts.rollbacks.has(n) && !facts.activeCompensator.has(n) && !facts.afterPivotSucceed.has(n))
      ) {
        if (facts.used && this.options.verbose) {
          this.options.logger.log(`Saga has been finished for facts: ${facts.id}, node: ${n}`);
        }
        continue;
      }
      const nodeMeta = this.nodeMeta(n);
      if (nodeMeta?.runAfterNodesSucceed?.length) {
        const pending = nodeMeta.runAfterNodesSucceed.filter((name) => !facts.processedNodes.has(name as NodeName));
        if (pending.length) {
          const failed = nodeMeta.runAfterNodesSucceed.find((name) => facts.failedNodes.has(name as NodeName));
          if (failed) {
            const message = facts.nodeErrors[failed as NodeName];
            return this.exit(facts, message ? new Error(message) : undefined);
          }
          const execution = this.execution(n, facts);
          execution.status = 'waiting';
          execution.waitingFor = pending as NodeName[];
          this.touch(facts);
          continue;
        }
      }
      const execution = this.execution(n, facts);
      execution.status = 'queued';
      execution.waitingFor = undefined;
      facts.inUse.add(n);
      this.touch(facts);
      this.options.nodes.get(n).process(facts);
    }
  }

  public exit(facts: Facts<DataType, NodeName>, exitWith?: Error | NodeName | NodeName[]) {
    if (facts.used) {
      return;
    }
    facts.used = true;
    const now = Date.now();
    const isError = exitWith instanceof Error;
    const { meta } = facts;
    meta.finishedAt = now;
    meta.durationMs = now - meta.createdAt;
    if (isError) {
      if (meta.status !== 'expired') {
        meta.status = 'failed';
      }
      meta.error = meta.error || { message: (exitWith as Error).message, node: meta.currentNode, at: now };
    } else {
      meta.status = 'completed';
    }
    this.touch(facts);
    if (isError) {
      facts.rollbacks.forEach((node: NodeName) => this.next(node, facts));
    } else {
      const nodes = (Array.isArray(exitWith) ? exitWith : [exitWith]).filter(Boolean) as NodeName[];
      nodes.forEach((node) => facts.afterPivotSucceed.add(node));
      nodes.forEach((node) => this.next(node, facts));
    }
    this.options.eventEmitter.emit(facts.id, isError ? exitWith : undefined, facts);
    this.settle(facts);
  }

  public retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error) {
    const execution = this.execution(node, facts);
    const now = Date.now();
    if (error) {
      this.addError(execution, error, now);
    }
    if (execution.retries < execution.maxRetries && !facts.used) {
      execution.retries += 1;
      execution.status = 'retrying';
      execution.nextAttemptAt = now + execution.retryDelay;
      this.touch(facts);
      return this.schedule(node, facts, execution.nextAttemptAt);
    }
    facts.inUse.delete(node);
    execution.status = 'failed';
    facts.failedNodes.add(node);
    if (error) {
      facts.nodeErrors[node] = error.message;
    }
    const { rollbackWhenErrorNode, rollbackWhenSuccessNode } = this.nodeMeta(node) || {};
    if (rollbackWhenErrorNode) {
      facts.activeCompensator.add(rollbackWhenErrorNode as NodeName);
      if (rollbackWhenSuccessNode) {
        facts.rollbacks.delete(rollbackWhenSuccessNode as NodeName);
      }
      this.next(rollbackWhenErrorNode as NodeName, facts);
    } else {
      const reason = error || new Error(`Exceeded the limit of retries at '${node}' node`);
      if (!error) {
        this.addError(execution, reason, now);
      }
      this.exit(facts, reason);
    }
    this.settle(facts);
  }

  public schedule(node: NodeName, facts: Facts<DataType, NodeName>, at: number) {
    const timer = setTimeout(
      () => {
        facts.timers.delete(timer);
        facts.inUse.delete(node);
        this.next(node, facts);
        this.settle(facts);
      },
      Math.max(0, at - Date.now()),
    );
    facts.timers.add(timer);
  }

  public settle(facts: Facts<DataType, NodeName>) {
    if (facts.used && !facts.inUse.size && !facts.timers.size) {
      this.options.onSettled(facts);
    }
  }

  protected addError(execution: NodeExecution<NodeName>, error: Error, at: number) {
    execution.errors.push({ message: error.message, node: execution.node, attempt: execution.attempts, at });
  }

  /** Records an error on the node that is currently running (routing errors). */
  protected recordError(facts: Facts<DataType, NodeName>, error: Error): Error {
    const execution = facts.meta.nodes[facts.meta.currentNode];
    if (execution) {
      this.addError(execution, error, Date.now());
    }
    return error;
  }

  protected touch(facts: Facts<DataType, NodeName>) {
    facts.meta.updatedAt = Date.now();
  }
}
