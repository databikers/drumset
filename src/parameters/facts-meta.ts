export type FactsMeta = {
  expireAfter: number;
  executeAfter: number;
  retries: number;
  retriesLimit: number;
  timeoutBetweenRetries: number;
  lastRetryTime: number;
  compensatorNode?: string;
};
