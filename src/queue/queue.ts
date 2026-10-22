import { Facts } from '@parameters';

/** FIFO queue shared by the replicas of one node. Idle replicas wait for `enqueue` instead of polling. */
export class Queue<DataType, NodeName extends string> {
  private data: Facts<DataType, NodeName>[] = [];
  private waiters: (() => void)[] = [];

  get size() {
    return this.data.length;
  }

  enqueue(facts: Facts<DataType, NodeName>): number {
    const size = this.data.push(facts);
    this.wakeUp();
    return size;
  }

  dequeue(): Facts<DataType, NodeName> | undefined {
    return this.data.shift();
  }

  /** Resolves on the next `enqueue` (or `wakeUp`). */
  waitForItem(): Promise<void> {
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** Releases every waiting replica (they re-check the queue and their running state). */
  wakeUp() {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
