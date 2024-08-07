export enum FactsMetaKeys {
  RETRIES = 'retries',
  RETRIES_LIMIT = 'retriesLimit',
  EXECUTE_AFTER = 'executeAfter',
  EXPIRE_AFTER = 'expireAfter',
  COMPENSATOR_NODE = 'compensatorNode',
  TIMEOUT_BETWEEN_RETRIES = 'timeoutBetweenRetries',
  LAST_RETRY_TIME = 'lastRetryTime',
}

export const factsMetaKeys: string[] = Object.values(FactsMetaKeys);
