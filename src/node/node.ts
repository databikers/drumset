import { NodeOptions } from '@options';
import { Queue, QueueProcessor } from '@queue';
import { Executor, Middleware } from '@parameters';

export class Node<DataType, NodeName extends string> {
  private readonly queue: Queue<DataType, NodeName>;
  private readonly queueProcessor: QueueProcessor<DataType, NodeName>;
  protected middleware: Map<NodeName, Middleware<DataType, NodeName>[]>;

  constructor(nodeOptions: NodeOptions<DataType, NodeName>) {
    const { executor, framework, verbose, logger, queue, index, middleware } = nodeOptions;
    this.queue = queue;
    this.middleware = middleware;
    this.queueProcessor = new QueueProcessor({
      name: nodeOptions.name,
      queue,
      executor,
      framework,
      middleware,
      verbose,
      logger,
      rrProxy: nodeOptions.rrProxy,
      index: index,
    });
  }

  public stopProcessing() {
    return this.queueProcessor.stopProcessing();
  }
}
