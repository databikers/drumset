import { EventEmitter } from 'events';
import { Logger } from '@logger';
import { Facts, NodeMeta } from '@parameters';
import { Processor } from '@node';

export type FrameworkOptions<DataType, NodeName extends string> = {
  eventEmitter: EventEmitter;
  logger: Logger;
  meta: Map<NodeName, NodeMeta>;
  nodes: Map<NodeName, Processor<DataType, NodeName>>;
  verbose: boolean;
  /** Called once a fact exited and has no active node left (rollbacks / after-exit nodes done). */
  onSettled: (facts: Facts<DataType, NodeName>) => void;
};
