export enum FactsMetaKeys {
  RETRIES = 'retries',
  RETRIES_LIMIT = 'retriesLimit',
  EXECUTE_AFTER = 'executeAfter',
  EXPIRE_AFTER = 'expireAfter',
  ROLLBACK_WHEN_ERROR_NODE = 'rollbackWhenErrorNode',
  ROLLBACK_WHEN_SUCCESS_NODE = 'rollbackWhenSuccessNode',
  TIMEOUT_BETWEEN_RETRIES = 'timeoutBetweenRetries',
  LAST_RETRY_TIME = 'lastRetryTime',
  RUN_AFTER_NODES_SUCCEED = 'runAfterNodesSucceed',
}

export const factsMetaKeys: string[] = Object.values(FactsMetaKeys);
