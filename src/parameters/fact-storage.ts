import { Fact } from './fact';

/**
 * Persists unfinished facts across restarts. Where they go is up to the implementation
 * (file, database, Redis, ...). `data` must be serializable by it.
 */
export interface FactStorage<DataType = any, NodeName extends string = string> {
  /** Returns the facts saved by the last `save` (empty array if none). */
  load(): Promise<Fact<DataType, NodeName>[]>;
  /** Replaces the stored facts with these (an empty array means nothing is pending). */
  save(facts: Fact<DataType, NodeName>[]): Promise<void>;
}
