import { Facts } from '@parameters';

export class Queue<T, Nodes extends string> {
  private data: Facts<T, Nodes>[];
  constructor() {
    this.data = [];
  }

  enqueue(facts: Facts<T, Nodes>): number {
    return this.data.push(facts);
  }

  dequeue(): Facts<T, Nodes> {
    return this.data.shift();
  }
}
