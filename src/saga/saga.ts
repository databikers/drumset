import { EventEmitter } from 'events';
import { v4 } from 'uuid'
import { Framework, FrameworkInterface } from '@framework';
import { Node } from '@node';
import { Executor, Facts } from '@parameters';
import * as console from 'console';

export class Saga<T, Nodes extends string> {

  protected eventEmitter: EventEmitter;
  protected nodes: Map<Nodes, Node<T, Nodes>>;
  protected meta: Map<Nodes, any>;
  protected framework: FrameworkInterface<T, Nodes>;

  constructor() {
    this.eventEmitter = new EventEmitter()
    this.nodes = new Map<Nodes, Node<T, Nodes>>();
    this.meta = new Map<Nodes, any>();
    this.framework = new Framework(this.nodes, this.eventEmitter);
  }

  addNode(node: Nodes, executor: Executor<T, Nodes>, factsMeta: any = {}){
    this.nodes.set(node, new Node<T, Nodes>({
      executor,
      framework: this.framework
    }));
    this.meta.set(node, factsMeta);
  }

  process(node: Nodes, data: T, meta?: any) {
    if (!this.nodes.has(node)) {
      throw new Error(`Node ${node} doesn't exist`)
    }
    const facts: Facts<T, Nodes> = {
      id: v4(),
      inUse: false,
      data,
      meta: meta || Object.assign({}, this.meta.get(node) || {})
    }
    return new Promise((resolve, reject) => {
      this.eventEmitter.on(facts.id, (error, facts) => {
        this.eventEmitter.removeAllListeners(facts.id);
        return error ? reject(error) : resolve(facts);
      });
      this.framework.next(node, facts)
    })
  }

}
