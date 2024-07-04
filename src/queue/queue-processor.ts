import { pseudoInterval } from '@helper'
import { QueueProcessorOptions } from '@options';
import { Facts, PseudoIntervalParams } from '@parameters';
export class QueueProcessor<T, Nodes extends string> {

  public pseudoIntervalParams: PseudoIntervalParams;

  constructor(queueProcessorOptions: QueueProcessorOptions<T, Nodes>) {
    const {
      queue,
      executor,
      framework
    } = queueProcessorOptions;

    this.pseudoIntervalParams = {
      executor: async () => {
        const item: Facts<T, Nodes> = queue.dequeue();
        if (item) {
          await executor(
            item.data,
            (node: Nodes) => {
              framework.next(node, item);
            },
            (error?: Error) => {
              framework.exit(item, error);
            })
        }
      },
      isRan: true,
      doExit: false,
      interval: 0
    }
    pseudoInterval(this.pseudoIntervalParams);
  }
}
