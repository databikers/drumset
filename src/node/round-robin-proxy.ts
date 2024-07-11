import { Queue } from '@queue';
import { Node } from './node';
import { AddNodeOptions } from '@options';
import { Facts } from '@parameters';
import { Processor } from './processor';

export class RoundRobinProxy<DataType, NodeName extends string> implements Processor<DataType, NodeName> {
  private readonly addNodeOptions: AddNodeOptions<DataType, NodeName>;
  private readonly queue: Queue<DataType, NodeName>;
  private readonly nodes: Node<DataType, NodeName>[];
  private currentIndex: number;

  constructor(addNodeOptions: AddNodeOptions<DataType, NodeName>) {
    this.addNodeOptions = addNodeOptions;
    this.queue = new Queue<DataType, NodeName>();
    this.nodes = [];
    this.currentIndex = 0;
    this.addNodes();
  }

  private addNodes() {
    const { scalingFactor, ...nodeOptions } = this.addNodeOptions;
    const nodesCount: number = this.nodes.length;
    for (let i = nodesCount; i < scalingFactor; i = i + 1) {
      this.nodes.push(
        new Node<DataType, NodeName>({
          queue: this.queue,
          index: this.nodes.length,
          ...nodeOptions,
        }),
      );
    }
  }

  public get node() {
    this.currentIndex =
      this.nodes.length === 1 || this.currentIndex >= this.nodes.length - 1 ? 0 : this.currentIndex + 1;
    return this.nodes[this.currentIndex];
  }

  process(facts: Facts<DataType, NodeName>): number {
    return this.queue.enqueue(facts);
  }
}
