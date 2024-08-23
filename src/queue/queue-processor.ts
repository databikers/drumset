import { QueueProcessorOptions } from '@options';
import { Facts, PseudoIntervalParams } from '@parameters';
import { pseudoInterval } from '@helper';
import { Logger } from '@logger';
import { RoundRobinProxy } from '@node';
import { FactsStatus } from '@const';

export class QueueProcessor<DataType, NodeName extends string> {
  public pseudoIntervalParams: PseudoIntervalParams;
  protected logger: Logger;
  protected verbose: boolean;
  private readonly index: number;
  protected readonly name: NodeName;
  private rrProxy: RoundRobinProxy<DataType, NodeName>;

  constructor(queueProcessorOptions: QueueProcessorOptions<DataType, NodeName>) {
    const { queue, executor, framework, verbose, logger, index, rrProxy } = queueProcessorOptions;
    this.index = index;
    this.name = queueProcessorOptions.name;
    this.verbose = verbose;
    this.logger = logger;
    this.pseudoIntervalParams = {
      executor: async () => {
        const item: Facts<DataType, NodeName> = queue.dequeue();
        if (item) {
          item.inUse = false;
          if (item.status === FactsStatus.ENQUEUED) {
            item.status = FactsStatus.PROCESSING;
            item.stats[FactsStatus.PROCESSING] = new Date().getTime();
          }
          const { currentNode, meta } = item;
          const { executeAfter, expireAfter, retries, retriesLimit, timeoutBetweenRetries, lastRetryTime } = meta;
          const now = new Date().getTime();
          if (expireAfter && expireAfter < now) {
            framework.exit(item, new Error(`Facts ${item.id} was expired`));
          }
          if (executeAfter && executeAfter > now) {
            return framework.next(currentNode, item);
          }
          if (meta.retriesLimit && meta.retries && now - lastRetryTime < timeoutBetweenRetries) {
            return framework.next(currentNode, item);
          }
          item.meta.lastRetryTime = new Date().getTime();
          try {
            await executor(
              item.data,
              (node: NodeName) => {
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
            item.meta.lastRetryTime = now;
            if (retries < retriesLimit) {
              item.meta.retries = meta.retries + 1;
              return framework.retry(currentNode, item, error);
            }
            if (item.meta.compensatorNode) {
              framework.next(item.meta.compensatorNode as NodeName, item);
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
      this.logger.log(`Stopped node "${this.name}[${this.index}]`);
    }
  }
}
