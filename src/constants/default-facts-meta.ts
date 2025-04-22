import { FactsMetaContract } from '@parameters';

export const defaultFactsMeta: FactsMetaContract<any> = {
  node: '',
  rollbackWhenErrorNode: undefined,
  rollbackWhenSuccessNode: undefined,
  lastRetryTime: 0,
  retriesLimit: 1,
  retries: 0,
  timeoutBetweenRetries: 0,
  retrying: false,
  runAfterNodes: []
};
