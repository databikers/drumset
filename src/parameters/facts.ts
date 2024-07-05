export type Facts<T, Nodes extends string> = {
  id: string;
  inUse: boolean;
  meta: Record<Nodes, any>;
  data: T
}
