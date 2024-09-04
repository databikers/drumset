import { FrameworkOptions } from '@options';
import { Facts, FactsMeta } from '@parameters';
import { FrameworkInterface } from './framework-interface';
import { FactsStatus } from '@const';

export class Framework<DataType, NodeName extends string> implements FrameworkInterface<DataType, NodeName> {
  protected options: FrameworkOptions<DataType, NodeName>;
  constructor(frameworkOptions: FrameworkOptions<DataType, NodeName>) {
    this.options = frameworkOptions;
  }

  public next(node: NodeName, facts: Facts<DataType, NodeName>) {
    if (!this.options.nodes.has(node)) {
      return this.exit(facts, new Error(`Node ${node} doesn't exist`));
    }
    if (facts) {
      const { id, currentNode } = facts;
      if (!facts.inUse && !facts.used) {
        facts.inUse = true;
        if (facts.currentNode !== node) {
          const defaultMeta: FactsMeta = this.options.meta.get(node);
          const {
            compensatorNode,
            expireAfter,
            executeAfter,
            timeoutBetweenRetries,
            retries,
            retriesLimit,
            lastRetryTime,
          } = facts.meta;
          facts.currentNode = node;
          facts.meta = {
            expireAfter: expireAfter || defaultMeta.expireAfter,
            executeAfter: executeAfter || defaultMeta.executeAfter,
            retries: retries || defaultMeta.retries,
            retriesLimit: retriesLimit || defaultMeta.retriesLimit,
            timeoutBetweenRetries: timeoutBetweenRetries || defaultMeta.timeoutBetweenRetries,
            compensatorNode: compensatorNode || defaultMeta.compensatorNode,
            lastRetryTime,
          };
          facts.meta = { ...facts.meta, ...this.options.meta.get(node) };
        } else {
          facts.meta.lastRetryTime = facts.meta.lastRetryTime || new Date().getTime();
        }
        this.options.nodes.get(node).process(facts);
      } else if (facts.used && this.options.verbose) {
        this.options.logger.log(`Saga has been finished for facts: ${id}, currentNode: ${currentNode}, node: ${node})`);
      } else if (facts.inUse && this.options.verbose) {
        this.options.logger.log(`Facts ${id} has being taken already, currentNode: ${currentNode}, node: ${node})`);
      }
    }
  }

  public exit(facts: Facts<DataType, NodeName>, error?: Error) {
    facts.used = true;
    facts.status = FactsStatus.PROCESSED;
    facts.stats[FactsStatus.PROCESSED] = new Date().getTime();
    this.options.eventEmitter.emit(facts.id, error, facts.data);
  }

  public retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error) {
    const { retries, retriesLimit } = facts.meta;
    if (retries < retriesLimit) {
      facts.meta.retries = (facts.meta.retries || 0) + 1;
      facts.stats.retries = facts.meta.retries;
      this.next(node, facts);
    } else {
      this.exit(facts, error || new Error(`Exceeded the limit of retries at "${node}" node`));
    }
  }
}
