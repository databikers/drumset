export type ExecutorNextFunction<NodeName> = (node: NodeName | NodeName[]) => void;
export type ExecutorExitFunction<NodeName> = (exitWith?: Error | NodeName | NodeName[]) => void;
export type ExecutorRetryFunction = (error?: Error) => void;

export type Executor<DataType, NodeName extends string> = (
  data: DataType,
  next: ExecutorNextFunction<NodeName>,
  exit: ExecutorExitFunction<NodeName>,
  retry: ExecutorRetryFunction,
) => Promise<any> | any;

export type Middleware<DataType, NodeName extends string> = (
  data: DataType,
  next: ExecutorNextFunction<NodeName>,
  exit: ExecutorExitFunction<NodeName>,
) => Promise<any> | any;
