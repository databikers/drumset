import { Logger } from '@logger';
import { FactStorage } from '@parameters';

export type SagaOptions = {
  verbose?: boolean;
  logger?: Logger;
  /** Saves unfinished facts on shutdown and loads them in `restore()`. */
  storage?: FactStorage<any, any>;
  /**
   * Save to `storage` on SIGTERM / SIGINT / SIGHUP and when the event loop drains, then let the
   * process exit as it would have. Default: `true` when `storage` is set.
   */
  handleSignals?: boolean;
  /** How long `shutdown()` waits for running handlers before saving anyway, ms. Default 10000. */
  shutdownTimeout?: number;
};
