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
  if (
    hasProperty(options, 'storage') &&
    options.storage !== undefined &&
    (typeof options.storage?.load !== 'function' || typeof options.storage?.save !== 'function')
  ) {
    throw new Error(`SagaOptions.storage should have async load() and save(facts) methods`);
  }
  if (hasProperty(options, 'handleSignals') && typeof options.handleSignals !== 'boolean') {
    throw new Error(`SagaOptions.handleSignals should be a boolean`);
  }
  if (
    hasProperty(options, 'shutdownTimeout') &&
    (typeof options.shutdownTimeout !== 'number' || !(options.shutdownTimeout >= 0))
  ) {
    throw new Error(`SagaOptions.shutdownTimeout should be a non-negative number`);
  }
}
