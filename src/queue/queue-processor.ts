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
            // checking
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
