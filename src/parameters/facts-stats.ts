export type FactsStats<NodeName extends string> = Record<
  NodeName,
  {
    enqueued?: number;
    processed?: number;
    retries?: number;
    errors?: string[];
  }
>;
