import { Queue } from '@queue';
import { AddNodeOptions } from './add-node-options';

export interface NodeOptions<T, Nodes extends string> extends AddNodeOptions<T, Nodes> {
  queue: Queue<T, Nodes>;
  index: number;
}
