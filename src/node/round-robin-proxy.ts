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
    this.addNodes(addNodeOptions.scaling.minNodes);
  }

  public get rebalanced() {
    return this.queue.size < this.addNodeOptions.scaling.queueSizeScalingThreshold;
  }

  public get downScaled() {
    return this.nodes.length <= this.addNodeOptions.scaling.minNodes;
  }

  public get scalingFactor() {
    return Math.floor(this.queue.size/Math.floor(this.addNodeOptions.scaling.queueSizeScalingThreshold));
  }

  public get node() {
    this.currentIndex =
      this.nodes.length === 1 || this.currentIndex >= this.nodes.length - 1 ? 0 : this.currentIndex + 1;
    return this.nodes[this.currentIndex];
  }

  private addNodes(count: number) {
    const {
      scaling,
      ...nodeOptions
    } = this.addNodeOptions;
    const nodesCount: number = this.nodes.length;
    let calculatedThreshold: number = count + this.nodes.length;
    if (calculatedThreshold < Math.floor(scaling.minNodes)) {
      calculatedThreshold = Math.floor(scaling.minNodes);
    } else if (calculatedThreshold > Math.floor(scaling.maxNodes)) {
      calculatedThreshold = Math.floor(scaling.maxNodes)
    }
    for (let i = nodesCount; i < calculatedThreshold; i = i + 1) {
      this.nodes.push(
        new Node<DataType, NodeName>({
          queue: this.queue,
          index: this.nodes.length,
          rrProxy: this,
          ...nodeOptions
        }),
      );
    }
  }

  public downScale() {
    if (this.currentIndex < this.nodes.length - 1 && this.nodes.length > Math.floor(this.addNodeOptions.scaling.minNodes)) {
      const [ node] = this.nodes.splice(this.nodes.length - 1, 1);
      node.stopProcessing();
    }
  }

  public upScale() {
    if (this.nodes.length < this.addNodeOptions.scaling.maxNodes) {
      const { maxNodes } = this.addNodeOptions.scaling;
      const count = this.nodes.length + this.scalingFactor > maxNodes ? maxNodes - this.nodes.length : this.scalingFactor;
      this.addNodes(count);
    }
  }

  process(facts: Facts<DataType, NodeName>): number {
    return this.queue.enqueue(facts);
  }
}
