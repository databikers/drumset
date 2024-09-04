import { Queue } from '@queue';
import { AddNodeOptions } from './add-node-options';
import { RoundRobinProxy } from '@node';

export interface NodeOptions<T, Nodes extends string> extends Omit<AddNodeOptions<T, Nodes>, 'scaling'> {
  queue: Queue<T, Nodes>;
  index: number;
  rrProxy: RoundRobinProxy<T, Nodes>;
}
