import { SagaOptions } from '@options';
import { Logger } from '@logger';

export const defaultSagaOptions: SagaOptions = {
  verbose: false,
  logger: console as Logger
}
