import { SagaOptions } from '@options';
import { Logger } from '@logger';

export const defaultSagaOptions: SagaOptions = {
  verbose: true,
  logger: console as Logger,
};
