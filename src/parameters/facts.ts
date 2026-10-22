import { FactMeta, NodeExecution } from './fact';

/**
 * Runtime state of a fact (internal). `meta` is the public, serializable metadata kept up to date;
 * the sets are the fast working copy of `meta.flow` and are written back when a snapshot is taken.
 */
export type Facts<DataType, NodeName extends string> = {
  id: string;
  data: DataType;
  meta: FactMeta<NodeName>;
  processedNodes: Set<NodeName>;
  failedNodes: Set<NodeName>;
  activeCompensator: Set<NodeName>;
  rollbacks: Set<NodeName>;
  afterPivotSucceed: Set<NodeName>;
  /** Nodes queued, running, waiting or retrying. */
  inUse: Set<NodeName>;
  nodeErrors: Partial<Record<NodeName, string>>;
  /** `exit` was reached. */
  used: boolean;
  /** First error thrown by a handler; passed to the next handlers as their `error` argument. */
  error?: Error;
  /** Pending retry / delay timers, cleared on shutdown (their target time is kept in `nextAttemptAt`). */
  timers: Set<NodeJS.Timeout>;
};

export type NodeExecutionRecord<NodeName extends string> = NodeExecution<NodeName>;
