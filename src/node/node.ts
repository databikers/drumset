import { NodeOptions } from '@options';
import { Facts } from '@parameters';
import { Queue, QueueProcessor } from '@queue';

export class Node<T, Nodes extends string> {
  private readonly queue: Queue<T, Nodes>;
  private readonly queueProcessor: QueueProcessor<T, Nodes>;

  constructor(nodeOptions: NodeOptions<T, Nodes>) {
    const { executor, framework, verbose, logger } = nodeOptions;
    const queue: Queue<T, Nodes> = new Queue<T, Nodes>();
    this.queue = queue;
    this.queueProcessor = new QueueProcessor({
      queue,
      executor,
      framework,
      verbose,
      logger,
    });
  }

  process(facts: Facts<T, Nodes>): number {
    return this.queue.enqueue(facts);
  }
}
