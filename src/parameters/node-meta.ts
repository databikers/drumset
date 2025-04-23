export type NodeMeta = {
  retriesLimit: number;
  lastRetryTime: number;
  timeoutBetweenRetries: number;
  rollbackWhenErrorNode?: string;
  rollbackWhenSuccessNode?: string;
  runAfterNodesSucceed?: string[];
};
