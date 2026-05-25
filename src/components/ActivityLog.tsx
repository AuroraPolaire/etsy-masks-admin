import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Surface } from './ui/Surface';
import { formatExactDateTime, formatRelativeTime } from '../lib/dates';

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
      <h2 className="text-base font-bold text-ink-strong">Activity log</h2>
    </CardHeader>
    <CardBody>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No activity yet.</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-auto pr-1">
          {items.map((item) => (
            <Surface as="li" key={item.id} variant="muted" className="p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={levelTone[item.level]}>{item.level}</Badge>
                <time
                  className="text-xs text-ink-muted"
                  dateTime={item.createdAt}
                  title={formatExactDateTime(item.createdAt)}
                >
                  {formatRelativeTime(item.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-sm text-ink-base">{item.message}</p>
            </Surface>
          ))}
        </ul>
      )}
    </CardBody>
  </Card>
);
