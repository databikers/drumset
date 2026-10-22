import { Facts, NodeExecution, NodeMeta } from '@parameters';

export interface FrameworkInterface<DataType, NodeName extends string> {
  next(nodes: NodeName | NodeName[], facts: Facts<DataType, NodeName>): void;
  exit(facts: Facts<DataType, NodeName>, exitWith?: Error | NodeName | NodeName[]): void;
  /** A node failed: retries it if allowed, otherwise runs its compensation or fails the fact. */
  retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error): void;
  /** Re-enters `node` at `at` (Unix ms) through `next`; the timer is tracked on the fact. */
  schedule(node: NodeName, facts: Facts<DataType, NodeName>, at: number): void;
  /** Execution record of `node`, created on first use. */
  execution(node: NodeName, facts: Facts<DataType, NodeName>): NodeExecution<NodeName>;
  nodeMeta(node: NodeName): NodeMeta | undefined;
  /** Called whenever a node leaves the fact; releases the fact once it exited and nothing is active. */
  settle(facts: Facts<DataType, NodeName>): void;
}
