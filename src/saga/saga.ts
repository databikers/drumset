import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import { SagaOptions } from '@options';
import { Executor, Facts, FactsMeta } from '@parameters';
import { defaultFactsMeta, defaultSagaOptions, FactsMetaKeys } from '@const';
import { Framework, FrameworkInterface } from '@framework';
import { Node } from '@node';
import { validateAddNodeParams, validateFactsMeta, validateSagaOptions } from '@helper';

export class Saga<T, Nodes extends string> {
  protected options: SagaOptions;
  protected eventEmitter: EventEmitter;
  protected nodes: Map<Nodes, Node<T, Nodes>>;
  protected meta: Map<Nodes, FactsMeta>;
  protected framework: FrameworkInterface<T, Nodes>;

  constructor(sagaOptions?: SagaOptions) {
    validateSagaOptions(sagaOptions);
    this.options = sagaOptions ? { ...defaultSagaOptions, ...sagaOptions } : defaultSagaOptions;
    this.eventEmitter = new EventEmitter();
    this.nodes = new Map<Nodes, Node<T, Nodes>>();
    this.meta = new Map<Nodes, any>();
    this.framework = new Framework({
      nodes: this.nodes,
      eventEmitter: this.eventEmitter,
      verbose: this.options.verbose,
      logger: this.options.logger,
      meta: this.meta,
    });
  }

  addNode(node: Nodes, executor: Executor<T, Nodes>, factsMeta: Partial<FactsMeta> = defaultFactsMeta) {
    validateAddNodeParams(node, executor, factsMeta);
    this.nodes.set(
      node,
      new Node<T, Nodes>({
        executor,
        framework: this.framework,
        verbose: this.options.verbose,
        logger: this.options.logger,
      }),
    );
    this.meta.set(node, { ...defaultFactsMeta, ...factsMeta });
  }

  process(node: Nodes, data: T, factsMeta?: Partial<FactsMeta>) {
    if (!node || !this.nodes.has(node)) {
      throw new Error(`Node ${node} doesn't exist`);
    }
    if (!data) {
      throw new Error(`The "data" can't be nullable`);
    }
    validateFactsMeta(factsMeta as FactsMeta);
    const facts: Facts<T, Nodes> = {
      id: v4(),
      inUse: false,
      used: false,
      currentNode: node,
      data,
      meta: (factsMeta as FactsMeta) || this.meta.get(node),
    };
    return new Promise((resolve, reject) => {
      this.eventEmitter.on(facts.id, (error, facts) => {
        this.eventEmitter.removeAllListeners(facts.id);
        return error ? reject(error) : resolve(facts);
      });
      this.framework.next(node, facts);
    });
  }
}
