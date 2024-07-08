import { FactsMeta } from './facts-meta';
import { FactsMetaKeys } from '@const';

export type Facts<T, Nodes extends string> = {
  id: string;
  inUse: boolean;
  used: boolean;
  currentNode: Nodes;
  meta: Record<FactsMetaKeys, number>;
  data: T
}
