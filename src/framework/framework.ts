import { EventEmitter } from 'events';
import { Node } from '@node';
import { Facts } from '@parameters';
import { FrameworkInterface } from './framework-interface';

export class Framework<T, Nodes extends string> implements FrameworkInterface<T, Nodes>{

  private readonly nodes: Map<Nodes, Node<T, Nodes>>;
  private readonly eventEmitter: EventEmitter;
  constructor(nodes: Map<Nodes, Node<T, Nodes>>, eventEmitter: EventEmitter) {
    this.nodes = nodes;
    this.eventEmitter = eventEmitter;
  }

  public next(node: Nodes, facts: Facts<T, Nodes>) {
    if (!this.nodes.has(node)) {
      return console.log(`Node ${node} doesn't exist`);
    }
    this.nodes.get(node).process(facts);
  }

  public exit(facts: Facts<T, Nodes>, error?: Error) {
    this.eventEmitter.emit(facts.id, error, facts);
  }
}
