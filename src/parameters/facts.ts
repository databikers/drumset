import { FactsMeta } from './facts-meta';

export type Facts<DataType, NodeName extends string> = {
  id: string;
  currentNode: NodeName;
  data: DataType;
  meta: FactsMeta;
  inUse: boolean;
  used: boolean;
};
