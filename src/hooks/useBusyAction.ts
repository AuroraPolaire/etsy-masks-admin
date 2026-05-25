import { useCallback, useRef, useState } from 'react';

import type { BusyAction, BusyActionContext, BusyActionName } from '../types';

export const useBusyAction = () => {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [busyProgress, setBusyProgress] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runBusyAction = useCallback(
    async <Result>(
      action: BusyActionName,
      task: (context: BusyActionContext) => Result | Promise<Result>,
    ) => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setBusyAction(action);
      setBusyProgress(null);

      try {
        return await task({
          signal: abortController.signal,
          setProgress: setBusyProgress,
        });
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setBusyAction(null);
        setBusyProgress(null);
      }
    },
    [],
  );

  const cancelBusyAction = useCallback(() => {
    abortControllerRef.current?.abort();
    setBusyProgress('Cancelling...');
  }, []);

  return {
    busyAction,
    busyProgress,
    cancelBusyAction,
    runBusyAction,
  };
};
