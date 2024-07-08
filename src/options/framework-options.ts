import { EventEmitter } from 'events';
import { Node } from '@node';
import { Logger } from '@logger';
import { FactsMeta } from '@parameters';

export type FrameworkOptions<T, Nodes extends string> = {
  nodes: Map<Nodes, Node<T, Nodes>>;
  eventEmitter: EventEmitter;
  verbose: boolean;
  logger: Logger,
  meta: Map<Nodes, FactsMeta>
}
