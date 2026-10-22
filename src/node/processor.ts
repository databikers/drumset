import { Facts } from '@parameters';

export interface Processor<DataType, NodeName extends string> {
  process(facts: Facts<DataType, NodeName>): number;
  stopProcessing(): void;
  /** Resolves when no handler of this node is running. */
  idle(): Promise<void>;
}
