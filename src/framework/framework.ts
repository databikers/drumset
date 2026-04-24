import { defaultFactsMeta, FactsStatus } from '@const';
import { FrameworkOptions } from '@options';
import { Facts, FactsMeta, FactsMetaContract, NodeMeta } from '@parameters';
import { FrameworkInterface } from './framework-interface';

export class Framework<DataType, NodeName extends string> implements FrameworkInterface<DataType, NodeName> {
  protected options: FrameworkOptions<DataType, NodeName>;
  constructor(frameworkOptions: FrameworkOptions<DataType, NodeName>) {
    this.options = frameworkOptions;
  }

  public next(node: NodeName | NodeName[], facts: Facts<DataType, NodeName>) {
    facts.stats[facts.currentNode].processed = Date.now();
    let nodes = Array.isArray(node) ? node.filter((item: any) => typeof item === 'string' && item) : [node];
    nodes = nodes.filter((item: any) => typeof item === 'string' && item);
    if (!nodes.length) {
      const errorMessage: string = 'next function requires a non-empty array/string';
      facts.stats[facts.currentNode].errors.push(errorMessage);
      return this.exit(facts, new Error(errorMessage));
    }
    if (facts) {
      for (const n of nodes) {
        if (!this.options.nodes.has(n)) {
          facts.stats[facts.currentNode].errors.push(`Node ${n} doesn't exist`);
          return this.exit(facts, new Error(`Node ${n} doesn't exist`));
        }
        if (
          facts.processedNodes.has(n) ||
          (facts.used && !facts.rollbacks.has(n) && !facts.activeCompensator.has(n) && !facts.afterPivotSucceed.has(n))
        ) {
          continue;
        }
        const nodeMeta: NodeMeta = this.options.meta.get(n);
        if (nodeMeta?.runAfterNodesSucceed?.length) {
          const needWait: boolean = nodeMeta?.runAfterNodesSucceed.some(
            (name: NodeName) => !facts.processedNodes.has(name),
          );
          if (needWait) {
            const needExit: boolean = nodeMeta?.runAfterNodesSucceed.some((name: NodeName) =>
              facts.failedNodes.has(name),
            );
            if (needExit) {
              const [errorNode] =
                nodeMeta?.runAfterNodesSucceed.filter((name: NodeName) => facts.failedNodes.has(name)) || [];
              return this.exit(
                facts,
                errorNode ? new Error(facts.nodeErrors[errorNode as NodeName] as string) : undefined,
              );
            }
            continue;
          }
        }
        if (!facts.meta[n]) {
          facts.meta[n] = {
            ...defaultFactsMeta,
            ...nodeMeta,
            node: n,
          } as FactsMetaContract<NodeName>;
        } else {
          facts.meta[n].node = n;
        }
        const meta = facts.meta[n];
        meta.retrying = false;
        const { id } = facts;
        if (
          (!facts.inUse.size || nodes.includes(n)) &&
          (!facts.used || facts.activeCompensator.has(n) || facts.rollbacks.has(n) || facts.afterPivotSucceed.has(n))
        ) {
          facts.inUse.add(n);
          meta.lastRetryTime = Date.now();
          this.options.nodes.get(n).process(facts);
        } else if (facts.used && this.options.verbose) {
          this.options.logger.log(`Saga has been finished for facts: ${id}, node: ${n})`);
        } else if (facts.inUse.size && this.options.verbose) {
          this.options.logger.log(`Facts ${id} has being taken already, ${n}, node: ${n})`);
        }
      }
    }
  }

  public exit(facts: Facts<DataType, NodeName>, exitWith?: Error | NodeName | NodeName[]) {
    if (facts.used) {
      return;
    }
    facts.used = true;
    facts.status = FactsStatus.PROCESSED;
    facts.stats[facts.currentNode].processed = Date.now();
    const isError: boolean = exitWith instanceof Error;
    if (isError) {
      facts.rollbacks.forEach((node: NodeName) => {
        this.next(node, facts);
      });
    } else {
      const nodes = Array.isArray(exitWith) ? exitWith : [exitWith];
      nodes.forEach((node: NodeName) => {
        facts.afterPivotSucceed.add(node);
      });
      nodes.forEach((node: NodeName) => {
        this.next(node, facts);
      });
    }
    this.options.eventEmitter.emit(facts.id, isError ? exitWith : undefined, facts.data, facts.stats);
  }

  public retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error) {
    facts.inUse.delete(node);
    const meta = facts.meta[node];
    const { retries, retriesLimit } = meta;
    if (retries < retriesLimit && !facts.used) {
      meta.retries = meta.retries || 1;
      meta.retries += 1;
      facts.stats[node].retries = (facts.stats[node].retries || 1) + 1;
      meta.retrying = true;
      return this.next(node, facts);
    }
    facts.failedNodes.add(node);
    facts.nodeErrors[node] = error.message;
    if (meta.rollbackWhenErrorNode) {
      facts.activeCompensator.add(meta.rollbackWhenErrorNode);
      if (meta.rollbackWhenSuccessNode) {
        facts.rollbacks.delete(meta.rollbackWhenSuccessNode);
      }
      return this.next(meta.rollbackWhenErrorNode as NodeName, facts);
    }
    facts.stats[facts.currentNode].errors.push(`Exceeded the limit of retries at '${node}' node`);
    this.exit(facts, error || new Error(`Exceeded the limit of retries at '${node}' node`));
  }
}
