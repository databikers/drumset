export type ExecutorNextFunction<NodeName> = (node: NodeName) => void;
export type ExecutorExitFunction = (error?: Error) => void;
export type ExecutorRetryFunction = (error?: Error) => void;

export type Executor<DataType, NodeName extends string> = (
  data: DataType,
  next: ExecutorNextFunction<NodeName>,
  exit: ExecutorExitFunction,
  retry: ExecutorRetryFunction,
) => Promise<any> | any;
