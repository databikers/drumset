import { Executor, FactsMeta } from '@parameters';
import { Logger } from '@logger';
import { FrameworkInterface } from '@framework';

export interface NodeOptions<T, Nodes extends string> {
  executor: Executor<T, Nodes>
  framework: FrameworkInterface<T, Nodes>;
  verbose: boolean;
  logger: Logger;
}
