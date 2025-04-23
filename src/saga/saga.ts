import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import { SagaOptions, Scaling } from '@options';
import { Executor, Facts, FactsMeta, FactsMetaContract, Middleware, NodeMeta } from '@parameters';
import { defaultFactsMeta, defaultSagaOptions, defaultScaling, FactsStatus } from '@const';
import { Framework, FrameworkInterface } from '@framework';
import { Processor, RoundRobinProxy } from '@node';
import { validateAddNodeParams, validateFactsMeta, validateSagaOptions } from '@helper';

export class Saga<DataType, NodeName extends string> {
  protected options: SagaOptions;
  protected eventEmitter: EventEmitter;
  protected nodes: Map<NodeName, Processor<DataType, NodeName>>;
  protected facts: Map<string, Facts<DataType, NodeName>>;
  protected middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;
  protected meta: Map<NodeName, NodeMeta>;
  protected framework: FrameworkInterface<DataType, NodeName>;

  constructor(sagaOptions?: SagaOptions) {
    validateSagaOptions(sagaOptions);
    this.options = sagaOptions ? { ...defaultSagaOptions, ...sagaOptions } : defaultSagaOptions;
    this.eventEmitter = new EventEmitter();
    this.nodes = new Map<NodeName, Processor<DataType, NodeName>>();
    this.facts = new Map<string, Facts<DataType, NodeName>>();
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

  public addMiddleware(nodes: NodeName[], middlewares: Middleware<DataType, NodeName>[]) {
    for (const node of nodes) {
      this.middleware.set(node, middlewares);
    }
  }

  public addNode(
    node: NodeName,
    executor: Executor<DataType, NodeName>,
    nodeMeta: Partial<NodeMeta> = {},
    scaling: Scaling = defaultScaling,
  ) {
    validateAddNodeParams(node, executor, nodeMeta, scaling);
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
    this.meta.set(node, nodeMeta as NodeMeta);
    if (this.options.verbose) {
      this.options.logger.log(`Added node ${node} (${scaling.minNodes} - ${scaling.maxNodes})`);
    }
  }

  public process(startNode: NodeName, data: DataType, factsMeta?: Partial<FactsMetaContract<NodeName>>) {
    if (!startNode || !this.nodes.has(startNode)) {
      throw new Error(`Node ${startNode} doesn't exist`);
    }
    if (!data) {
      throw new Error(`The "data" can't be nullable`);
    }
    validateFactsMeta(factsMeta as FactsMetaContract<NodeName>);
    const facts: Facts<DataType, NodeName> = {
      id: v4(),
      processedNodes: new Set<NodeName>(),
      enqueuedNodes: new Set<NodeName>(),
      failedNodes: new Set<NodeName>(),
      nodeErrors: new Map<NodeName, Error>(),
      data,
      meta: new Map<NodeName, FactsMetaContract<NodeName>>(),
      stats: {
        retries: new Map<NodeName, number>(),
        [FactsStatus.ENQUEUED]: new Date().getTime(),
      },
      status: FactsStatus.ENQUEUED,
      inUse: new Set(),
      activeCompensator: new Set(),
      rollbacks: new Set(),
      used: false,
    };
    const nodeMeta = this.meta.get(startNode);
    factsMeta = Object.assign({}, factsMeta);
    facts.meta.set(startNode, { ...(factsMeta as FactsMetaContract<NodeName>), ...nodeMeta } || defaultFactsMeta);
    facts.meta.get(startNode).node = startNode;
    this.facts.set(facts.id, facts);
    return new Promise((resolve, reject) => {
      this.eventEmitter.on(facts.id, (error, facts) => {
        this.eventEmitter.removeAllListeners(facts.id);
        if (this.options.verbose) {
          this.options.logger.log(facts.stats);
        }
        this.facts.delete(facts.id);
        return error ? reject(error) : resolve(facts);
      });
      this.framework.next(startNode, facts);
    });
  }

  public state() {
    this.nodes.forEach((roundRobinProxy: RoundRobinProxy<DataType, NodeName>, nodeName: NodeName) => {
      this.options.logger.log(
        `Node "${nodeName}" has ${roundRobinProxy.nSize} replica${roundRobinProxy.nSize > 1 ? 's' : ''} and ${roundRobinProxy.qSize} queue size`,
      );
    });
  }
}
