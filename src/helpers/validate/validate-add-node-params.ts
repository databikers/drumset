import { getItemFromArrayByType } from '../service';
import { validateParamsLength } from './validate-params-length';
import { validateFactsMeta } from './validate-facts-meta';
import { validateScalingFactor } from './validate-scaling-factor';

export function validateAddNodeParams(...params: any[]): void {
  validateParamsLength('Saga.addNode', params, 2, 4);
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
  const scaling = getItemFromArrayByType(params, 'object', 1);
  validateScalingFactor(scaling);
}
