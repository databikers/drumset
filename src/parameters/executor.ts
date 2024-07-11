export type Executor<DataType, NodeName extends string> = (
  data: DataType,
  next: (node: NodeName) => void,
  exit: (error?: Error) => void,
  retry: (error?: Error) => void,
) => Promise<any> | any;
