import { Executor } from '@parameters';
import { FrameworkInterface } from '@framework';

export interface NodeOptions<T, Nodes extends string> {
  executor: Executor<T, Nodes>
  framework: FrameworkInterface<T, Nodes>;
}
