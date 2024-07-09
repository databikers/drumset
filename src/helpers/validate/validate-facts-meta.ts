import { FactsMeta } from '@parameters';
import { factsMetaKeys } from '@const';

export function validateFactsMeta(factsMeta: FactsMeta, isRequired: boolean = false): void {
  if (typeof factsMeta === 'undefined' && !isRequired) {
    return;
  }
  if (!factsMeta || typeof factsMeta !== 'object' || !Object.keys(factsMeta).length) {
    throw new Error(`Metadata should be a valid object contains at list on of fields: ${factsMetaKeys.join(', ')}`);
  }
  for (const key in factsMeta) {
    if (!factsMetaKeys.includes(key)) {
      throw new Error(`Property "${key}" is not valid metadata property`);
    }
  }
}
