import { FactsMeta } from './facts-meta';

export type Executor<T, Nodes extends string> = (
  data: T,
  next: (node: Nodes) => void,
  exit: (error?: Error) => void,
  retry: (error?: Error) => void,
) => Promise<any> | any;
