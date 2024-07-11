import { Queue } from '@queue';
import { NodeOptions } from './node-options';

export interface QueueProcessorOptions<DataType, NodeName extends string> extends NodeOptions<DataType, NodeName> {
  queue: Queue<DataType, NodeName>;
}
