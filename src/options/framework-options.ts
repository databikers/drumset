import { EventEmitter } from 'events';
import { Logger } from '@logger';
import { FactsMeta } from '@parameters';
import { Processor } from '@node';

export type FrameworkOptions<DataType, NodeName extends string> = {
  eventEmitter: EventEmitter;
  logger: Logger;
  meta: Map<NodeName, FactsMeta>;
  nodes: Map<NodeName, Processor<DataType, NodeName>>;
  verbose: boolean;
};
