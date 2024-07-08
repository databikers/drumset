import { Facts } from '@parameters';

export interface FrameworkInterface<T, Nodes extends string> {
  next(node: Nodes, facts: Facts<T, Nodes>): void;
  exit(facts: Facts<T, Nodes>, error?: Error): void;
  retry(node: Nodes, facts: Facts<T, Nodes>, error?: Error): void;
}
