import { Executor, Middleware } from '@parameters';
import { Logger } from '@logger';
import { FrameworkInterface } from '@framework';

export interface Scaling {
  minNodes: number;
  maxNodes: number;
  queueSizeScalingThreshold: number;
}

export interface AddNodeOptions<DataType, NodeName extends string> {
  name: NodeName;
  executor: Executor<DataType, NodeName>;
  framework: FrameworkInterface<DataType, NodeName>;
  middleware?: Map<NodeName, Middleware<DataType, NodeName>[]>;
  verbose: boolean;
  logger: Logger;
  scaling: Scaling;
}
