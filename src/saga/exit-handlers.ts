import { Logger } from '@logger';

const SIGNALS: NodeJS.Signals[] = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
];
const SIGNAL_EXIT_CODES: Partial<Record<NodeJS.Signals, number>> = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 };

let registered = false;
let logger: Logger = console;
let terminate: () => Promise<void> = async () => undefined;
let exiting = false;
let drained = false;

function onSignal(signal: NodeJS.Signals) {
  if (exiting) {
    // Second Ctrl+C / SIGTERM while saving: the operator wants out now.
    logger.log(`Saga: received ${signal} again, exiting without waiting for storage`);
    process.exit(SIGNAL_EXIT_CODES[signal] ?? 1);
  }
  exiting = true;
  terminate()
    .catch((error) => logger.log('Saga: saving facts on shutdown failed', error))
    .finally(() => {
      unregisterExitHandlers();
      // The application listens to this signal too: it decides when to exit.
      if (process.listenerCount(signal) > 0) {
        return;
      }
      // Otherwise behave as if we were never here: default action for the signal (exit code 128 + n).
      process.kill(process.pid, signal);
    });
}

function onBeforeExit() {
  // The event loop is empty. Saving schedules work, after which beforeExit fires again: run once.
  if (drained || exiting) {
    return;
  }
  drained = true;
  terminate().catch((error) => logger.log('Saga: saving facts on exit failed', error));
}

/** Installs process handlers once for all saga instances. */
export function registerExitHandlers(log: Logger, terminateAll: () => Promise<void>) {
  logger = log;
  terminate = terminateAll;
  if (registered) {
    return;
  }
  registered = true;
  exiting = false;
  drained = false;
  SIGNALS.forEach((signal) => process.on(signal, onSignal));
  process.on('beforeExit', onBeforeExit);
}

export function unregisterExitHandlers() {
  if (!registered) {
    return;
  }
  registered = false;
  SIGNALS.forEach((signal) => process.removeListener(signal, onSignal));
  process.removeListener('beforeExit', onBeforeExit);
}
