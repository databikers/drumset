import { QueueProcessorOptions } from '@options';
import { Facts, PseudoIntervalParams } from '@parameters';
import { pseudoInterval } from '@helper'
import { Logger } from '@logger';

export class QueueProcessor<T, Nodes extends string> {

  public pseudoIntervalParams: PseudoIntervalParams;
  protected logger: Logger;
  protected verbose: boolean;

  constructor(queueProcessorOptions: QueueProcessorOptions<T, Nodes>) {
    const {
      queue,
      executor,
      framework,
      verbose,
      logger
    } = queueProcessorOptions;

    this.pseudoIntervalParams = {
      executor: async () => {
        const item: Facts<T, Nodes> = queue.dequeue();
        if (item) {
          item.inUse = false;
          const now = new Date().getTime();
          const { currentNode, meta } = item;
          const {
            executeAfter,
            expireAfter,
            retries,
            retriesLimit
          } = meta[currentNode];
          if (expireAfter && expireAfter < now) {
            framework.exit(item, new Error(`Facts ${item.id} was expired`));
          }
          if (executeAfter && expireAfter > now) {
            framework.next(currentNode, item);
            return;
          }
          try {
            await executor(
              item.data,
              (node: Nodes) => {
                framework.next(node, item);
              },
              (error?: Error) => {
                framework.exit(item, error);
              })
          } catch(error) {
            if (retries < retriesLimit) {
              meta[currentNode].retries =  meta[currentNode].retries + 1;
              framework.next(currentNode, item)
            }
            framework.exit(item, error)
          }
        }
      },
      isRan: true,
      doExit: false,
      interval: 0
    }
    pseudoInterval(this.pseudoIntervalParams);
  }
}
