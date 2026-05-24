import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';

import type { ActivityItem } from '../types';

type ActivityLogProps = {
  items: ActivityItem[];
};

const levelTone = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
} as const;

export const ActivityLog = ({ items }: ActivityLogProps) => (
  <Card>
    <CardHeader>
      <h2 className="text-base font-bold text-slate-950">Activity log</h2>
    </CardHeader>
    <CardBody>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-auto pr-1">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={levelTone[item.level]}>{item.level}</Badge>
                <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                </time>
              </div>
              <p className="mt-2 text-sm text-slate-700">{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </CardBody>
  </Card>
);
