/** Lifecycle of a fact. `completed`, `failed` and `expired` are final: `exit` was reached. */
export type FactStatus = 'pending' | 'running' | 'completed' | 'failed' | 'expired';

/**
 * Lifecycle of one node for one fact.
 * - `queued`: waiting for a free node replica
 * - `waiting`: delayed (`executeAfter`) or blocked by `runAfterNodesSucceed` (see `waitingFor`)
 * - `retrying`: failed, the next attempt is scheduled at `nextAttemptAt`
 */
export type NodeStatus = 'queued' | 'waiting' | 'running' | 'retrying' | 'succeeded' | 'failed';

export type FactError<NodeName extends string = string> = {
  message: string;
  /** Node where the error happened, if any. */
  node?: NodeName;
  /** Attempt number (1-based) of that node. */
  attempt?: number;
  /** Unix time, ms. */
  at: number;
};

/** Execution record of one node for one fact. All times are Unix time in ms. */
export type NodeExecution<NodeName extends string = string> = {
  node: NodeName;
  status: NodeStatus;
  /** How many times the handler started. */
  attempts: number;
  /** Retries used so far. */
  retries: number;
  /** Retries allowed after the first attempt (`retriesLimit`). */
  maxRetries: number;
  /** Delay before a retry (`timeoutBetweenRetries`). */
  retryDelay: number;
  /** First time the node was queued for this fact. */
  enqueuedAt: number;
  /** Start of the last attempt. */
  startedAt?: number;
  /** End of the last attempt. */
  finishedAt?: number;
  /** Duration of the last attempt. */
  durationMs?: number;
  /** Duration of all attempts together. */
  totalDurationMs: number;
  /** When a delayed or retried node runs next. */
  nextAttemptAt?: number;
  /** Nodes that must succeed first (`runAfterNodesSucceed`). */
  waitingFor?: NodeName[];
  /** Every error of this node, oldest first. */
  errors: FactError<NodeName>[];
};

/** Saga control state needed to resume a fact exactly where it stopped. Maintained by the saga. */
export type FactFlow<NodeName extends string = string> = {
  /** Nodes that finished successfully. */
  processed: NodeName[];
  /** Nodes that failed after all retries. */
  failed: NodeName[];
  /** Rollback nodes of succeeded nodes, run if the saga fails later. */
  rollbacks: NodeName[];
  /** Compensation nodes activated by failed nodes. */
  compensators: NodeName[];
  /** Nodes requested by `exit([...])` to run after the result was returned. */
  afterExit: NodeName[];
  /** `exit` was reached (the result was returned). */
  exited: boolean;
};

export type FactMeta<NodeName extends string = string> = {
  status: FactStatus;
  startNode: NodeName;
  /** Node that started most recently. Several nodes may run in parallel: see `activeNodes`. */
  currentNode: NodeName;
  /** Nodes queued, running, waiting or retrying right now. */
  activeNodes: NodeName[];
  /** Nodes in the order they first started. */
  path: NodeName[];
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  /** From creation to `exit`. */
  durationMs?: number;
  /** Time to live in ms, counted from `createdAt`. */
  ttl?: number;
  /** Absolute expiry time; the fact fails with status `expired` after it. */
  expiresAt?: number;
  /** The start node does not run before this time. */
  executeAfter?: number;
  /** Fact-level retries limit (see `Saga.process`). */
  maxRetries?: number;
  /** Error the fact finished with. */
  error?: FactError<NodeName>;
  /** Execution record per node. */
  nodes: Partial<Record<NodeName, NodeExecution<NodeName>>>;
  flow: FactFlow<NodeName>;
};

/** Serializable unit of work: what storage receives and returns. */
export type Fact<DataType = unknown, NodeName extends string = string> = {
  id: string;
  meta: FactMeta<NodeName>;
  data: DataType;
};
