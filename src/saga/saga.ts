import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import { SagaOptions, Scaling } from '@options';
import { Executor, Facts, FactsMeta, Middleware } from '@parameters';
import { defaultFactsMeta, defaultSagaOptions, defaultScaling, FactsStatus } from '@const';
import { Framework, FrameworkInterface } from '@framework';
import { Processor, RoundRobinProxy } from '@node';
import { validateAddNodeParams, validateFactsMeta, validateSagaOptions } from '@helper';

export class Saga<DataType, NodeName extends string> {
  protected options: SagaOptions;
  protected eventEmitter: EventEmitter;
  protected nodes: Map<NodeName, Processor<DataType, NodeName>>;
  protected middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;
  protected meta: Map<NodeName, FactsMeta>;
  protected framework: FrameworkInterface<DataType, NodeName>;

  constructor(sagaOptions?: SagaOptions) {
    validateSagaOptions(sagaOptions);
    this.options = sagaOptions ? { ...defaultSagaOptions, ...sagaOptions } : defaultSagaOptions;
    this.eventEmitter = new EventEmitter();
    this.nodes = new Map<NodeName, Processor<DataType, NodeName>>();
    this.middleware = new Map<NodeName, Middleware<DataType, NodeName>[]>();
    this.meta = new Map<NodeName, any>();
    this.framework = new Framework({
      nodes: this.nodes,
      eventEmitter: this.eventEmitter,
      verbose: this.options.verbose,
      logger: this.options.logger,
      meta: this.meta,
    });
  }

  addMiddleware(nodes: NodeName[], middlewares: Middleware<DataType, NodeName>[]) {
    for (const node of nodes) {
      this.middleware.set(node, middlewares);
    }
  }

  addNode(
    node: NodeName,
    executor: Executor<DataType, NodeName>,
    factsMeta: Partial<FactsMeta> = defaultFactsMeta,
    scaling: Scaling = defaultScaling,
  ) {
    validateAddNodeParams(node, executor, factsMeta, scaling);
    this.nodes.set(
      node,
      new RoundRobinProxy<DataType, NodeName>({
        name: node,
        executor,
        framework: this.framework,
        middleware: this.middleware,
        verbose: this.options.verbose,
        logger: this.options.logger,
        scaling,
      }),
    );
    this.meta.set(node, { ...defaultFactsMeta, ...factsMeta });
    if (this.options.verbose) {
      this.options.logger.log(`Added node ${node} (${scaling.minNodes} - ${scaling.maxNodes})`);
    }
  }

  process(startNode: NodeName, data: DataType, factsMeta?: Partial<FactsMeta>) {
    if (!startNode || !this.nodes.has(startNode)) {
      throw new Error(`Node ${startNode} doesn't exist`);
    }
    if (!data) {
      throw new Error(`The "data" can't be nullable`);
    }
    validateFactsMeta(factsMeta as FactsMeta);
    const facts: Facts<DataType, NodeName> = {
      id: v4(),
      currentNode: startNode,
      data,
      meta: (factsMeta as FactsMeta) || this.meta.get(startNode),
      stats: {
        retries: 0,
        [FactsStatus.ENQUEUED]: new Date().getTime(),
      },
      status: FactsStatus.ENQUEUED,
      inUse: false,
      used: false,
    };
    return new Promise((resolve, reject) => {
      this.eventEmitter.on(facts.id, (error, facts) => {
        this.eventEmitter.removeAllListeners(facts.id);
        if (this.options.verbose) {
          this.options.logger.log(facts.stats);
        }
        return error ? reject(error) : resolve(facts);
      });
      this.framework.next(startNode, facts);
    });
  }

  public state() {
    this.nodes.forEach((roundRobinProxy: RoundRobinProxy<DataType, NodeName>, nodeName: NodeName) => {
      this.options.logger.log(
        `Node "${nodeName}" has ${roundRobinProxy.nSize} replicas and ${roundRobinProxy.qSize} queue size`,
      );
    });
  }
}
