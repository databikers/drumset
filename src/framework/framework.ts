import { defaultFactsMeta, FactsStatus } from '@const';
import { FrameworkOptions } from '@options';
import { Facts, NodeMeta } from '@parameters';
import { FrameworkInterface } from './framework-interface';

export class Framework<DataType, NodeName extends string> implements FrameworkInterface<DataType, NodeName> {
  protected options: FrameworkOptions<DataType, NodeName>;
  constructor(frameworkOptions: FrameworkOptions<DataType, NodeName>) {
    this.options = frameworkOptions;
  }

  public next(node: NodeName | NodeName[], facts: Facts<DataType, NodeName>) {
    let nodes = Array.isArray(node) ? node.filter((item: any) => typeof item === 'string' && item) : [node];
    nodes = nodes.filter((item: any) => typeof item === 'string' && item);
    if (!nodes.length) {
      return this.exit(facts, new Error('next function requires a non-empty array/string'));
    }
    if (facts) {
      for (const n of nodes) {
        if (!this.options.nodes.has(n)) {
          return this.exit(facts, new Error(`Node ${n} doesn't exist`));
        }
        if (facts.processedNodes.has(n) || (facts.used && !facts.rollbacks.has(n) && facts.activeCompensator.has(n))) {
          continue;
        }
        const nodeMeta: NodeMeta = this.options.meta.get(n);
        if (nodeMeta?.runAfterNodes?.length) {
          const needWait: boolean = nodeMeta?.runAfterNodes.some((name: NodeName) => !facts.processedNodes.has(name));
          if (needWait) {
            const needExit: boolean = nodeMeta?.runAfterNodes.some((name: NodeName) => facts.failedNodes.has(name));
            if (needExit) {
              const [errorNode] = nodeMeta?.runAfterNodes.filter((name: NodeName) => facts.failedNodes.has(name)) || [];
              return this.exit(facts, errorNode ? facts.nodeErrors.get(errorNode as NodeName) : undefined);
            }
            continue;
          }
        }
        if (!facts.meta.has(n)) {
          facts.meta.set(n, {
            ...defaultFactsMeta,
            ...nodeMeta,
            node: n,
          });
        } else {
          facts.meta.get(n).node = n;
        }
        const meta = facts.meta.get(n);
        meta.retrying = false;
        const { id } = facts;
        if (
          (!facts.inUse.size || nodes.includes(n)) &&
          (!facts.used || facts.activeCompensator.has(n) || facts.rollbacks.has(n))
        ) {
          facts.inUse.add(n);
          meta.lastRetryTime = new Date().getTime();
          this.options.nodes.get(n).process(facts);
        } else if (facts.used && this.options.verbose) {
          this.options.logger.log(`Saga has been finished for facts: ${id}, node: ${n})`);
        } else if (facts.inUse.size && this.options.verbose) {
          this.options.logger.log(`Facts ${id} has being taken already, ${n}, node: ${n})`);
        }
      }
    }
  }

  public exit(facts: Facts<DataType, NodeName>, error?: Error) {
    facts.used = true;
    facts.status = FactsStatus.PROCESSED;
    facts.stats[FactsStatus.PROCESSED] = new Date().getTime();
    if (error) {
      facts.rollbacks.forEach((node: NodeName) => {
        this.next(node, facts);
      });
    }
    this.options.eventEmitter.emit(facts.id, error, facts.data);
  }

  public retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error) {
    facts.inUse.delete(node);
    const meta = facts.meta.get(node);
    const { retries, retriesLimit } = meta;
    if (retries < retriesLimit && !facts.used) {
      meta.retrying = true;
      return this.next(node, facts);
    }
    facts.failedNodes.add(node);
    facts.nodeErrors.set(node, error);
    if (meta.rollbackWhenErrorNode) {
      facts.activeCompensator.add(meta.rollbackWhenErrorNode);
      if (meta.rollbackWhenSuccessNode) {
        facts.rollbacks.delete(meta.rollbackWhenSuccessNode);
      }
      return this.next(meta.rollbackWhenErrorNode as NodeName, facts);
    }
    this.exit(facts, error || new Error(`Exceeded the limit of retries at '${node}' node`));
  }
}
