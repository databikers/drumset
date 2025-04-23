import { Facts } from '@parameters';

export interface FrameworkInterface<DataType, NodeName extends string> {
  next(nodes: NodeName | NodeName[], facts: Facts<DataType, NodeName>): void;
  exit(facts: Facts<DataType, NodeName>, error?: Error): void;
  retry(node: NodeName, facts: Facts<DataType, NodeName>, error?: Error): void;
}
