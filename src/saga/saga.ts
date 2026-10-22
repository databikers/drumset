import { EventEmitter } from 'events';
import { SagaOptions, Scaling } from '@options';
import { Executor, Fact, FactMeta, Facts, Middleware, NodeMeta, ProcessOptions } from '@parameters';
import { DEFAULT_SHUTDOWN_TIMEOUT, defaultSagaOptions, defaultScaling } from '@const';
import { Framework, FrameworkInterface } from '@framework';
import { Processor, RoundRobinProxy } from '@node';
import { validateAddNodeParams, validateFactsMeta, validateSagaOptions, v4 } from '@helper';
import { registerExitHandlers, unregisterExitHandlers } from './exit-handlers';

/**
 * Events (on the saga instance):
 * - `completed` (fact): a fact reached `exit` without error
 * - `failed` (fact, error): a fact reached `exit` with an error (or expired)
 * They fire for every fact, including facts resumed by `restore()`, whose `process()` promise
 * belonged to the previous process.
 */
export class Saga<DataType, NodeName extends string> extends EventEmitter {
  private static instances = new Set<Saga<any, any>>();
  protected options: SagaOptions;
  protected eventEmitter: EventEmitter;
  protected nodes: Map<NodeName, Processor<DataType, NodeName>>;
  protected facts: Map<string, Facts<DataType, NodeName>>;
  protected middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;
  protected meta: Map<NodeName, NodeMeta>;
  protected framework: FrameworkInterface<DataType, NodeName>;
  /** Restored facts whose nodes are not registered: kept as they are and saved again. */
  protected parked: Fact<DataType, NodeName>[] = [];
  private shuttingDown: Promise<void> | null = null;

  constructor(sagaOptions?: SagaOptions) {
    super();
    validateSagaOptions(sagaOptions);
    this.options = { ...defaultSagaOptions, ...(sagaOptions || {}) };
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(0);
    this.nodes = new Map<NodeName, Processor<DataType, NodeName>>();
    this.facts = new Map<string, Facts<DataType, NodeName>>();
    this.middleware = new Map<NodeName, Middleware<DataType, NodeName>[]>();
    this.meta = new Map<NodeName, NodeMeta>();
    this.framework = new Framework({
      nodes: this.nodes,
      eventEmitter: this.eventEmitter,
      verbose: this.options.verbose,
      logger: this.options.logger,
      meta: this.meta,
      onSettled: (facts) => this.facts.delete(facts.id),
    });
    Saga.instances.add(this);
    if (this.options.handleSignals ?? !!this.options.storage) {
      registerExitHandlers(this.options.logger, () => Saga.terminate());
    }
  }

  /** Shuts every saga down (saving to storage where configured). */
  public static terminate(): Promise<void> {
    return Promise.allSettled([...Saga.instances].map((saga) => saga.shutdown())).then((): void => undefined);
  }

  /** @internal Sagas that save on process exit. */
  public static get all(): Saga<any, any>[] {
    return [...Saga.instances];
  }

  /** Stops taking facts from the queues. Running handlers finish; nothing is saved (see `shutdown`). */
  public stop() {
    this.nodes.forEach((processor) => processor.stopProcessing());
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

  public process(startNode: NodeName, data: DataType, options?: ProcessOptions): Promise<DataType> {
    if (!startNode || !this.nodes.has(startNode)) {
      throw new Error(`Node ${startNode} doesn't exist`);
    }
    if (!data) {
      throw new Error(`The "data" can't be nullable`);
    }
    if (this.shuttingDown) {
      throw new Error('Saga is shutting down');
    }
    validateFactsMeta(options as any);
    const now = Date.now();
    // Fact options not passed to process() fall back to the start node's settings (addNode meta).
    const nodeMeta: Partial<NodeMeta> = this.meta.get(startNode) || {};
    const pick = <K extends 'ttl' | 'expireAfter' | 'executeAfter'>(key: K): number | undefined =>
      options?.[key] !== undefined ? options[key] : nodeMeta[key];
    const ttl = pick('ttl');
    const expireAfter = pick('expireAfter');
    const executeAfter = pick('executeAfter');
    // Not inherited: the start node already uses its own retriesLimit, and a fact-level value
    // would become the default of every other node.
    const retriesLimit = options?.retriesLimit;
    const expiresAt = [
      expireAfter,
      ttl ? now + ttl : undefined,
    ].filter((v) => typeof v === 'number');
    const meta: FactMeta<NodeName> = {
      status: 'pending',
      startNode,
      currentNode: startNode,
      activeNodes: [],
      path: [],
      createdAt: now,
      updatedAt: now,
      finishedAt: undefined,
      durationMs: undefined,
      ttl,
      expiresAt: expiresAt.length ? Math.min(...expiresAt) : undefined,
      executeAfter,
      maxRetries: retriesLimit,
      error: undefined,
      nodes: {},
      flow: { processed: [], failed: [], rollbacks: [], compensators: [], afterExit: [], exited: false },
    };
    const facts = this.toRuntime({ id: v4(), meta, data });
    this.facts.set(facts.id, facts);
    const result = this.track(facts);
    this.framework.next(startNode, facts);
    return result;
  }

  /** Unfinished facts as plain, serializable objects (what `storage.save` receives). */
  public snapshot(): Fact<DataType, NodeName>[] {
    return [
      ...[...this.facts.values()].map((facts) => this.toFact(facts)),
      ...this.parked,
    ];
  }

  /**
   * Loads facts from `storage` and resumes them where they stopped. Call it after all `addNode` calls.
   * Nodes that were running at shutdown run again, so handlers should be idempotent.
   * Returns how many facts were resumed.
   */
  public async restore(): Promise<number> {
    const { storage, logger, verbose } = this.options;
    if (!storage) {
      throw new Error('Saga.restore requires options.storage');
    }
    const loaded = (await storage.load()) || [];
    let resumed = 0;
    for (const fact of loaded) {
      if (!fact?.id || !fact.meta || this.facts.has(fact.id)) {
        continue;
      }
      const missing = Object.keys(fact.meta.nodes || {}).filter((node) => !this.nodes.has(node as NodeName));
      if (!this.nodes.has(fact.meta.startNode) || missing.length) {
        logger.log(`Fact ${fact.id} kept, not resumed: unknown node(s) ${missing.join(', ') || fact.meta.startNode}`);
        this.parked.push(fact);
        continue;
      }
      const facts = this.toRuntime(fact);
      this.facts.set(facts.id, facts);
      if (!facts.used) {
        this.track(facts).catch((): void => undefined);
      }
      const active = [...facts.inUse];
      if (!active.length && !facts.used) {
        // Nothing was queued (e.g. saved before the first node): start again.
        active.push(fact.meta.startNode);
      }
      for (const node of active) {
        const execution = this.framework.execution(node, facts);
        if (execution.status === 'running') {
          execution.status = 'queued';
        }
        facts.inUse.add(node);
        this.framework.schedule(node, facts, execution.nextAttemptAt || Date.now());
      }
      this.framework.settle(facts);
      resumed += 1;
    }
    if (verbose) {
      logger.log(`Restored ${resumed} fact(s), kept ${this.parked.length} unresumable`);
    }
    return resumed;
  }

  /**
   * Stops processing, waits for running handlers (up to `shutdownTimeout`), clears pending timers
   * and saves unfinished facts to `storage`. Safe to call more than once.
   */
  public shutdown(): Promise<void> {
    if (!this.shuttingDown) {
      this.shuttingDown = this.doShutdown();
    }
    return this.shuttingDown;
  }

  public state() {
    this.nodes.forEach((processor: Processor<DataType, NodeName>, nodeName: NodeName) => {
      const proxy = processor as RoundRobinProxy<DataType, NodeName>;
      this.options.logger.log(
        `Node "${nodeName}" has ${proxy.nSize} replica${proxy.nSize > 1 ? 's' : ''} and ${proxy.qSize} queue size`,
      );
    });
  }

  private async doShutdown() {
    const { storage, logger, shutdownTimeout = DEFAULT_SHUTDOWN_TIMEOUT } = this.options;
    this.stop();
    let timer: NodeJS.Timeout;
    const timedOut = await Promise.race([
      Promise.all([...this.nodes.values()].map((node) => node.idle())).then(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout((): void => resolve(true), shutdownTimeout);
      }),
    ]);
    clearTimeout(timer);
    if (timedOut) {
      logger.log(`Saga shutdown: handlers still running after ${shutdownTimeout} ms; saving their facts as they are`);
    }
    // Pending retries / delays are kept as `nextAttemptAt` and rescheduled by restore().
    this.facts.forEach((facts) => {
      facts.timers.forEach((t) => clearTimeout(t));
      facts.timers.clear();
    });
    Saga.instances.delete(this);
    if (!Saga.instances.size) {
      unregisterExitHandlers();
    }
    if (storage) {
      const facts = this.snapshot();
      await storage.save(facts);
      if (this.options.verbose) {
        logger.log(`Saga shutdown: saved ${facts.length} unfinished fact(s)`);
      }
    }
  }

  /** Resolves/rejects with the fact's result and emits `completed` / `failed`. */
  private track(facts: Facts<DataType, NodeName>): Promise<DataType> {
    return new Promise((resolve, reject) => {
      this.eventEmitter.once(facts.id, (error: Error | undefined, settled: Facts<DataType, NodeName>) => {
        if (this.options.verbose) {
          this.options.logger.log(JSON.stringify(this.toFact(settled).meta, null, 2));
        }
        const fact = this.toFact(settled);
        if (error) {
          this.emitSafe('failed', fact, error);
          return reject(error);
        }
        this.emitSafe('completed', fact);
        return resolve(settled.data);
      });
    });
  }

  private emitSafe(event: string, ...args: any[]) {
    if (this.listenerCount(event)) {
      this.emit(event, ...args);
    }
  }

  private toRuntime(fact: Fact<DataType, NodeName>): Facts<DataType, NodeName> {
    const { flow } = fact.meta;
    return {
      id: fact.id,
      data: fact.data,
      meta: fact.meta,
      processedNodes: new Set(flow.processed),
      failedNodes: new Set(flow.failed),
      activeCompensator: new Set(flow.compensators),
      rollbacks: new Set(flow.rollbacks),
      afterPivotSucceed: new Set(flow.afterExit),
      inUse: new Set(fact.meta.activeNodes),
      nodeErrors: Object.fromEntries(
        Object.values(fact.meta.nodes)
          .filter((execution: any) => execution?.status === 'failed' && execution.errors?.length)
          .map((execution: any) => [
            execution.node,
            execution.errors[execution.errors.length - 1].message,
          ]),
      ) as Partial<Record<NodeName, string>>,
      used: flow.exited,
      timers: new Set(),
    };
  }

  private toFact(facts: Facts<DataType, NodeName>): Fact<DataType, NodeName> {
    const meta: FactMeta<NodeName> = {
      ...facts.meta,
      activeNodes: [...facts.inUse],
      flow: {
        processed: [...facts.processedNodes],
        failed: [...facts.failedNodes],
        rollbacks: [...facts.rollbacks],
        compensators: [...facts.activeCompensator],
        afterExit: [...facts.afterPivotSucceed],
        exited: facts.used,
      },
    };
    facts.meta.activeNodes = meta.activeNodes;
    facts.meta.flow = meta.flow;
    // Copy so later changes don't leak into a snapshot handed to storage or listeners.
    return { id: facts.id, meta: structuredClone(meta), data: facts.data };
  }
}
