import { Queue } from '@queue';
import { NodeOptions } from './node-options';

export interface QueueProcessorOptions<T, Nodes extends string> extends NodeOptions<T, Nodes> {
  queue: Queue<T, Nodes>;
}
