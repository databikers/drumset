import { FactsMeta } from './facts-meta';
import { FactsStatus } from '@const';

export type Facts<DataType, NodeName extends string> = {
  id: string;
  processedNodes: Set<NodeName>;
  enqueuedNodes: Set<NodeName>;
  failedNodes: Set<NodeName>;
  nodeErrors: Map<NodeName, Error>;
  data: DataType;
  meta: FactsMeta<NodeName>;
  status: FactsStatus;
  stats: Partial<Record<FactsStatus, number>> & { retries?: Map<NodeName, number> };
  activeCompensator: Set<NodeName>;
  rollbacks: Set<NodeName>;
  inUse: Set<NodeName>;
  used: boolean;
};
