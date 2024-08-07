import { NodeOptions } from '@options';
import { Queue, QueueProcessor } from '@queue';

export class Node<DataType, NodeName extends string> {
  private readonly queue: Queue<DataType, NodeName>;
  private readonly queueProcessor: QueueProcessor<DataType, NodeName>;

  constructor(nodeOptions: NodeOptions<DataType, NodeName>) {
    const { executor, framework, verbose, logger, queue, index } = nodeOptions;
    this.queue = queue;
    this.queueProcessor = new QueueProcessor({
      queue,
      executor,
      framework,
      verbose,
      logger,
      index: index,
    });
  }
}
