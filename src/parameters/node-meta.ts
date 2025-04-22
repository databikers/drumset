export type NodeMeta = {
  expireAfter: number;
  executeAfter: number;
  retries: number;
  retriesLimit: number;
  lastRetryTime: number;
  timeoutBetweenRetries: number;
  rollbackWhenErrorNode?: string;
  rollbackWhenSuccessNode?: string;
  runAfterNodes?: string[];
};
