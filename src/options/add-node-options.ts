import { Executor } from '@parameters';
import { Logger } from '@logger';
import { FrameworkInterface } from '@framework';

export interface AddNodeOptions<DataType, NodeName extends string> {
  executor: Executor<DataType, NodeName>;
  framework: FrameworkInterface<DataType, NodeName>;
  verbose: boolean;
  logger: Logger;
  scalingFactor?: number;
}
