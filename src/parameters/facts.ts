import { FactsMeta } from './facts-meta';
import { FactsStatus } from '@const';
import { FactsStats } from './facts-stats';

export type Facts<DataType, NodeName extends string> = {
  id: string;
  processedNodes: Set<NodeName>;
  enqueuedNodes: Set<NodeName>;
  failedNodes: Set<NodeName>;
  nodeErrors: Record<NodeName, string>;
  currentNode?: NodeName;
  data: DataType;
  meta: FactsMeta<NodeName>;
  status: FactsStatus;
  stats: FactsStats<NodeName>;
  activeCompensator: Set<NodeName>;
  rollbacks: Set<NodeName>;
  afterPivotSucceed: Set<NodeName>;
  inUse: Set<NodeName>;
  used?: boolean;
  error?: Error;
};
