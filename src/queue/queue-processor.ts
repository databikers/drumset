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
            const timeoutValueExecuteAfter = executeAfter - now;
            setTimeout(() => {
              framework.next(this.name, item);
            }, timeoutValueExecuteAfter)
            return;
          }
          if (meta.retrying) {
            setTimeout(() => {
              framework.next(this.name, item);
            }, timeoutBetweenRetries||0)
            return ;
          }
          meta.lastRetryTime = new Date().getTime();
          try {
            const middlewares = this.middleware.get(this.name) || [];
            for (const m of middlewares) {
              await m(
                item.data,
                (node: NodeName | NodeName[]) => {
                  item.inUse.delete(this.name);
                  item.processedNodes.add(this.name);
                  item.meta.delete(this.name);
                  framework.next(node, item);
                },
                (error?: Error | NodeName | NodeName[]) => {
                  if (error instanceof Error) {
                    item.meta.delete(this.name);
                    item.failedNodes.add(this.name);
                  }
                  framework.exit(item, error);
                },
              );
            }
            item.enqueuedNodes.add(this.name);
            await executor(
              item.data,
              (node: NodeName | NodeName[]) => {
                item.inUse.delete(this.name);
                item.processedNodes.add(this.name);
                if (meta.rollbackWhenSuccessNode) {
                  item.rollbacks.add(meta.rollbackWhenSuccessNode);
                }
                framework.next(node, item);
              },
              (error?: Error | NodeName | NodeName[]) => {
                if (error instanceof Error) {
                  if (meta.rollbackWhenErrorNode) {
                    item.activeCompensator.add(meta.rollbackWhenErrorNode);
                  }
                }
                framework.exit(item, error);
              },
              (error?: Error) => {
                setTimeout(() => {
                  meta.retrying = true;
                  framework.retry(this.name, item, error);
                }, timeoutBetweenRetries || 0)
              },
              item.error,
            );
            if (item.rollbacks.has(this.name)) {
              item.processedNodes.add(this.name);
            }
          } catch (error) {
            if (!item.error) {
              item.error = error;
            }
            const meta = item.meta.get(this.name);
            item.nodeErrors.set(this.name, error);
            if (meta.retries < meta.retriesLimit) {
              setTimeout(() => {
                meta.retrying = true;
                framework.retry(this.name, item);
              }, timeoutBetweenRetries||0)
              return ;
            }
            item.failedNodes.add(this.name);
            item.meta.delete(this.name);
            if (meta.rollbackWhenErrorNode) {
              item.activeCompensator.add(meta.rollbackWhenErrorNode);
              if (meta.rollbackWhenSuccessNode) {
                item.rollbacks.delete(meta.rollbackWhenSuccessNode);
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
