export type Facts<T, Nodes extends string> = {
  id: string;
  inUse: boolean;
  used: boolean;
  currentNode: Nodes;
  meta: Record<Nodes, any>;
  data: T
}
