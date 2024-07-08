import { FactsMeta } from './facts-meta';

export type Facts<T, Nodes extends string> = {
  id: string;
  inUse: boolean;
  used: boolean;
  currentNode: Nodes;
  meta: FactsMeta<Nodes>;
  data: T
}
