import { FrameworkOptions } from '@options';
import { Facts } from '@parameters';
import { FrameworkInterface } from './framework-interface';

export class Framework<T, Nodes extends string> implements FrameworkInterface<T, Nodes>{

  protected options: FrameworkOptions<T, Nodes>;
  constructor(frameworkOptions: FrameworkOptions<T, Nodes>) {
    this.options = frameworkOptions;
  }

  public next(node: Nodes, facts: Facts<T, Nodes>) {
    if (!this.options.nodes.has(node)) {
      return this.exit(facts, new Error(`Node ${node} doesn't exist`));
    }
    if (facts) {
      const { id, currentNode} = facts;
      if (!facts.inUse && !facts.used) {
        facts.inUse = true;
        facts.currentNode = node;
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
}
