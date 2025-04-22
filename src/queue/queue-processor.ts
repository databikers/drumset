import { QueueProcessorOptions } from '@options';
import { Facts, Middleware, PseudoIntervalParams } from '@parameters';
import { pseudoInterval } from '@helper';
import { Logger } from '@logger';
import { FactsStatus } from '@const';

export class QueueProcessor<DataType, NodeName extends string> {
  public pseudoIntervalParams: PseudoIntervalParams;
  protected logger: Logger;
  protected verbose: boolean;
  private readonly index: number;
  protected readonly name: NodeName;
  protected middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;

  constructor(queueProcessorOptions: QueueProcessorOptions<DataType, NodeName>) {
    const { queue, executor, framework, verbose, logger, index, rrProxy, middleware } = queueProcessorOptions;
    this.index = index;
    this.name = queueProcessorOptions.name;
    this.verbose = verbose;
    this.logger = logger;
    this.middleware = middleware;
    this.pseudoIntervalParams = {
      executor: async () => {
        const item: Facts<DataType, NodeName> = queue.dequeue();
        if (item) {
          if (item.status === FactsStatus.ENQUEUED) {
            item.status = FactsStatus.PROCESSING;
            item.stats[FactsStatus.PROCESSING] = new Date().getTime();
          }
          const meta = item.meta.get(this.name);
          const { executeAfter, expireAfter, retries, retriesLimit, timeoutBetweenRetries, lastRetryTime } = meta;
          const now = new Date().getTime();
          if (expireAfter && expireAfter < now) {
            framework.exit(item, new Error(`Facts ${item.id} was expired`));
          }
          if (executeAfter && executeAfter > now) {
            return framework.next(this.name, item);
          }
          if (meta.retrying) {
            if (meta.retrying && meta.retriesLimit > meta.retries && now - lastRetryTime < timeoutBetweenRetries) {
              return framework.next(this.name, item);
            }
          }

          meta.lastRetryTime = new Date().getTime();
          try {
            const middlewares = this.middleware.get(this.name) || [];
            for (const m of middlewares) {
              await m(
                item.data,
                (node: NodeName) => {
                  item.inUse.delete(this.name);
                  item.processedNodes.add(this.name);
                  item.meta.delete(this.name);
                  framework.next(node, item);
                },
                (error?: Error) => {
                  item.meta.delete(this.name);
                  item.failedNodes.add(this.name);
                  framework.exit(item, error);
                },
              );
            }
            item.enqueuedNodes.add(this.name);
            await executor(
              item.data,
              (node: NodeName) => {
                item.inUse.delete(this.name);
                item.processedNodes.add(this.name);
                if (meta.rollbackWhenSuccessNode) {
                  item.rollbacks.add(meta.rollbackWhenSuccessNode)
                }
                framework.next(node, item);
              },
              (error?: Error) => {
                if (meta.rollbackWhenErrorNode) {
                  item.activeCompensator.add(meta.rollbackWhenErrorNode)
                }
                framework.exit(item, error);
              },
              (error?: Error) => {
                framework.retry(this.name, item, error);
              },
            );
            if (item.rollbacks.has(this.name)) {
              item.processedNodes.add(this.name);
            }
          } catch (error) {
            const meta = item.meta.get(this.name);
            item.nodeErrors.set(this.name, error);
            meta.lastRetryTime = now;
            if (meta.retries < meta.retriesLimit) {
              meta.retries = meta.retries || 0;
              meta.retries += 1;
              item.stats.retries.set(this.name, meta.retries);
              return framework.retry(this.name, item, error);
            }
            item.failedNodes.add(this.name);
            item.meta.delete(this.name);
            if (meta.rollbackWhenErrorNode) {
              item.activeCompensator.add(meta.rollbackWhenErrorNode);
              if (meta.rollbackWhenSuccessNode) {
                item.rollbacks.delete(meta.rollbackWhenSuccessNode)
              }
              framework.next(meta.rollbackWhenErrorNode, item);
            } else {
              framework.exit(item, error);
            }
          } finally {
            if (!rrProxy.rebalanced) {
              rrProxy.scalingUp();
            }
          }
        } else {
          if (!rrProxy.downScaled) {
            rrProxy.scalingDown();
          }
        }
      },
      isRan: true,
      doExit: false,
      interval: 0,
    };
    pseudoInterval(this.pseudoIntervalParams);
  }

  public stopProcessing() {
    this.pseudoIntervalParams.isRan = false;
    this.pseudoIntervalParams.doExit = true;
    if (this.verbose) {
      this.logger.log(`Stopped node '${this.name}[${this.index}]'`);
    }
  }
}
