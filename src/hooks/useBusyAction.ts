import { useCallback, useState } from 'react';

import type { BusyAction, BusyActionName } from '../types';

export const useBusyAction = () => {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const runBusyAction = useCallback(
    async <Result>(action: BusyActionName, task: () => Result | Promise<Result>) => {
      setBusyAction(action);

      try {
        return await task();
      } finally {
        setBusyAction(null);
      }
    },
    [],
  );

  return {
    busyAction,
    runBusyAction,
  };
};
