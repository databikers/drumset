import { NodeMeta, ProcessOptions } from '@parameters';
import { factsMetaKeys } from '@const';

export function validateFactsMeta(factsMeta: ProcessOptions | Partial<NodeMeta>, isRequired: boolean = false): void {
  if (typeof factsMeta === 'undefined' && !isRequired) {
    return;
  }
  // An empty object is fine: every field is optional (addNode defaults meta to {}).
  if (!factsMeta || typeof factsMeta !== 'object' || Array.isArray(factsMeta)) {
    throw new Error(`Metadata should be a valid object contains at list on of fields: ${factsMetaKeys.join(', ')}`);
  }
  for (const key in factsMeta) {
    if (!factsMetaKeys.includes(key)) {
      throw new Error(`Property "${key}" is not valid metadata property`);
    }
  }
  for (const key of [
    'ttl',
    'expireAfter',
    'executeAfter',
    'retriesLimit',
    'timeoutBetweenRetries',
  ]) {
    const value = (factsMeta as Record<string, unknown>)[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new Error(`Property "${key}" should be a non-negative number`);
    }
  }
}
