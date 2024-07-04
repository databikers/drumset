import { Executor, Facts } from '@parameters';
import { Framework } from '@framework';

export interface NodeOptions<T, Nodes extends string> {
  executor: Executor<T, Nodes>
  framework: Framework<T, Nodes>;
}
