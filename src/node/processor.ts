import { Facts } from '@parameters';

export interface Processor<DataType, NodeName extends string> {
  process(facts: Facts<DataType, NodeName>): number;
}
