import { FrameworkOptions } from '@options';
import { Facts, FactsMeta } from '@parameters';
import { FrameworkInterface } from './framework-interface';
import * as console from 'console';

export class Framework<T, Nodes extends string> implements FrameworkInterface<T, Nodes> {
  protected options: FrameworkOptions<T, Nodes>;
  constructor(frameworkOptions: FrameworkOptions<T, Nodes>) {
    this.options = frameworkOptions;
  }

  public next(node: Nodes, facts: Facts<T, Nodes>) {
    if (!this.options.nodes.has(node)) {
      return this.exit(facts, new Error(`Node ${node} doesn't exist`));
    }
    if (facts) {
      const { id, currentNode } = facts;
      if (!facts.inUse && !facts.used) {
        facts.inUse = true;
        if (facts.currentNode !== node) {
          const defaultMeta: FactsMeta = this.options.meta.get(node);
          const { expireAfter, executeAfter, timeoutBetweenRetries, retries, retriesLimit, lastRetryTime } = facts.meta;
          facts.currentNode = node;
          facts.meta = {
            expireAfter: expireAfter || defaultMeta.expireAfter,
            executeAfter: executeAfter || defaultMeta.executeAfter,
            retries: retries || defaultMeta.retries,
            retriesLimit: retriesLimit || defaultMeta.retriesLimit,
            timeoutBetweenRetries: timeoutBetweenRetries || defaultMeta.timeoutBetweenRetries,
            lastRetryTime,
          };
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

  public exit(facts: Facts<T, Nodes>, error?: Error) {
    facts.used = true;
    this.options.eventEmitter.emit(facts.id, error, facts.data);
  }

  public retry(node: Nodes, facts: Facts<T, Nodes>, error?: Error) {
    const { retries, retriesLimit } = facts.meta;
    if (retries < retriesLimit) {
      facts.meta.retries = facts.meta.retries + 1;
      this.next(node, facts);
    } else {
      this.exit(facts, error || new Error(`Exceeded the limit of retries at "${node}" node`));
    }
  }
}
