import { getItemFromArrayByType } from '../service';
import { validateParamsLength } from './validate-params-length';
import { validateFactsMeta } from './validate-facts-meta';

export function validateAddNodeParams(...params: any[]): void {
  validateParamsLength('Saga.addNode', params, 2, 3);
  const node = getItemFromArrayByType(params, 'string');
  if (!node) {
    throw new Error(`The "node" (string) is required property`);
  }
  const handler = getItemFromArrayByType(params, 'function');
  if (!handler) {
    throw new Error(`The "executor" (function) is required property`);
  }
  const meta = getItemFromArrayByType(params, 'object');
  validateFactsMeta(meta);
}
