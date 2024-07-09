import { SagaOptions } from '@options';
import { hasProperty } from '../service';

export function validateSagaOptions(options: SagaOptions): void {
  if (!options) {
    return;
  }
  if (hasProperty(options, 'verbose') && typeof options.verbose != 'boolean') {
    throw new Error(`SagaOptions.verbose should be a boolean`);
  }
  if (
    hasProperty(options, 'logger') &&
    (typeof options.logger != 'object' || !options.logger || typeof options.logger.log !== 'function')
  ) {
    throw new Error(`SagaOptions.logger.log should be a function`);
  }
}
