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
  runAfterNodes: NodeName[];
};

export type FactsMeta<NodeName extends string> = Map<NodeName, FactsMetaContract<NodeName>>;
