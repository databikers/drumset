import { FactsMeta } from './facts-meta';
import { FactsStatus } from '@const';

export type Facts<DataType, NodeName extends string> = {
  id: string;
  currentNode: NodeName;
  data: DataType;
  meta: FactsMeta;
  status: FactsStatus;
  stats: Partial<Record<FactsStatus, number>> & { retries?: number };
  inUse: boolean;
  used: boolean;
};
