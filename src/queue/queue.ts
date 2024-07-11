import { Facts } from '@parameters';

export class Queue<DataType, NodeName extends string> {
  private data: Facts<DataType, NodeName>[];
  constructor() {
    this.data = [];
  }

  enqueue(facts: Facts<DataType, NodeName>): number {
    return this.data.push(facts);
  }

  dequeue(): Facts<DataType, NodeName> {
    return this.data.shift();
  }
}
