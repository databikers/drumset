/**
 * Options of `Saga.process` for one fact.
 * - `expireAfter`: absolute time (ms) after which the fact fails as expired
 * - `ttl`: time to live in ms from now (alternative to `expireAfter`; the earlier one wins)
 * - `executeAfter`: absolute time (ms) before which the start node does not run
 * - `retriesLimit`: retries for the start node, and the default for nodes without their own `retriesLimit`
 */
export type ProcessOptions = {
  expireAfter?: number;
  ttl?: number;
  executeAfter?: number;
  retriesLimit?: number;
};

/** @deprecated Kept for compatibility; per-fact state is now in `Fact.meta` (see `FactMeta`). */
export type FactsMetaContract<NodeName> = {
  node: NodeName;
  expireAfter?: number;
  executeAfter?: number;
  retries: number;
  retriesLimit: number;
  timeoutBetweenRetries?: number;
  lastRetryTime?: number;
  rollbackWhenErrorNode?: NodeName;
  rollbackWhenSuccessNode?: NodeName;
  retrying?: boolean;
  runAfterNodesSucceed: NodeName[];
};
