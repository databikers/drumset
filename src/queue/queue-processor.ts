import { QueueProcessorOptions } from '@options';
import { Facts, FactsMeta, PseudoIntervalParams } from '@parameters';
import { pseudoInterval } from '@helper';
import { Logger } from '@logger';

export class QueueProcessor<T, Nodes extends string> {
  public pseudoIntervalParams: PseudoIntervalParams;
  protected logger: Logger;
  protected verbose: boolean;

  constructor(queueProcessorOptions: QueueProcessorOptions<T, Nodes>) {
    const { queue, executor, framework, verbose, logger } = queueProcessorOptions;
    this.pseudoIntervalParams = {
      executor: async () => {
        const item: Facts<T, Nodes> = queue.dequeue();
        if (item) {
          item.inUse = false;
          const { currentNode, meta } = item;
          const { executeAfter, expireAfter, retries, retriesLimit, timeoutBetweenRetries, lastRetryTime } = meta;
          const now = new Date().getTime();
          if (expireAfter && expireAfter < now) {
            framework.exit(item, new Error(`Facts ${item.id} was expired`));
          }
          if (executeAfter && executeAfter > now) {
            return framework.next(currentNode, item);
          }
          if (lastRetryTime && lastRetryTime - now < timeoutBetweenRetries) {
            return framework.next(currentNode, item);
          }
          try {
            await executor(
              item.data,
              (node: Nodes) => {
                framework.next(node, item);
              },
              (error?: Error) => {
                framework.exit(item, error);
              },
              (error?: Error) => {
                framework.retry(currentNode, item, error);
              },
            );
          } catch (error) {
            meta.lastRetryTime = now;
            if (retries < retriesLimit) {
              meta.retries = meta.retries + 1;
              framework.next(currentNode, item);
            }
            framework.exit(item, error);
          }
        }
      },
      isRan: true,
      doExit: false,
      interval: 0,
    };
    pseudoInterval(this.pseudoIntervalParams);
  }
}
