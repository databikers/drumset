import { PseudoIntervalParams } from '@parameters';

function loop(pseudoIntervalParams: PseudoIntervalParams) {
  const { executor, isRan, doExit, interval } = pseudoIntervalParams;

  setTimeout(async () => {
    if (isRan) {
      executor().finally(() => {
        if (!doExit) {
          loop(pseudoIntervalParams);
        }
      });
    } else if (!doExit) {
      loop(pseudoIntervalParams);
    }
  }, interval || 0);
}

export function pseudoInterval(pseudoIntervalParams: PseudoIntervalParams) {
  const { executor, isRan, doExit } = pseudoIntervalParams;

  if (isRan) {
    executor().finally(() => {
      if (!doExit) {
        loop(pseudoIntervalParams);
      }
    });
  } else if (!doExit) {
    loop(pseudoIntervalParams);
  }
}
