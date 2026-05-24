import { useCallback, useState } from 'react';

import { nowIso } from '../lib/dates';

import type { ActivityItem, ActivityLevel, ActivityType } from '../types';

export const useActivityLog = () => {
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);

  const addActivity = useCallback((type: ActivityType, level: ActivityLevel, message: string) => {
    setActivityLog((items) =>
      [
        {
          id: crypto.randomUUID(),
          type,
          level,
          message,
          createdAt: nowIso(),
        },
        ...items,
      ].slice(0, 80),
    );
  }, []);

  return {
    activityLog,
    addActivity,
  };
};
