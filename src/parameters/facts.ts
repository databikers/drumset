export type Facts<T, Nodes extends string> = {
  id: string;
  meta: Record<Nodes, any>;
  data: T
}
