export type Executor<T, Nodes extends string> = (
  data: T,
  next: (node: Nodes) => void,
  exit: (error?: Error) => void,
) => Promise<any> | any;
