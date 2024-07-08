import { FactsMetaKeys } from './facts-meta-keys';

export const defaultFactsMeta: Record<FactsMetaKeys, number> = {
  [FactsMetaKeys.RETRIES]: 0,
  [FactsMetaKeys.RETRIES_LIMIT]: 1,
  [FactsMetaKeys.EXPIRE_AFTER]: 0,
  [FactsMetaKeys.EXECUTE_AFTER]: 0
}
