export type NodeMeta = {
  retriesLimit: number;
  timeoutBetweenRetries: number;
  rollbackWhenErrorNode?: string;
  rollbackWhenSuccessNode?: string;
  runAfterNodesSucceed?: string[];
};
