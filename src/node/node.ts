import { NodeOptions } from '@options';
import { QueueProcessor } from '@queue';

export class Node<DataType, NodeName extends string> {
  private readonly queueProcessor: QueueProcessor<DataType, NodeName>;

  constructor(nodeOptions: NodeOptions<DataType, NodeName>) {
    this.queueProcessor = new QueueProcessor<DataType, NodeName>(nodeOptions);
  }

  public get busy(): boolean {
    return this.queueProcessor.busy;
  }

  public idle(): Promise<void> {
    return this.queueProcessor.idle();
  }

  public stopProcessing() {
    return this.queueProcessor.stopProcessing();
  }
}
