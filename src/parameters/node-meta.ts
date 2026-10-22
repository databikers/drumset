export type NodeMeta = {
  retriesLimit: number;
  timeoutBetweenRetries: number;
  rollbackWhenErrorNode?: string;
  rollbackWhenSuccessNode?: string;
  runAfterNodesSucceed?: string[];
  /** Default `ttl` (ms) of facts started at this node, when `process()` doesn't pass one. */
  ttl?: number;
  /** Default `expireAfter` (absolute ms) of facts started at this node, when `process()` doesn't pass one. */
  expireAfter?: number;
  /** Default `executeAfter` (absolute ms) of facts started at this node, when `process()` doesn't pass one. */
  executeAfter?: number;
};
