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

const getActivityGroup = (createdAt: string): string => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const sameDay = createdDate.toDateString() === now.toDateString();

  if (diffMs >= 0 && diffMs < 10 * 60 * 1000) {
    return 'Now';
  }

  if (sameDay) {
    return 'Earlier today';
  }

  return 'Previous';
};

const groupActivityItems = (items: ActivityItem[]) =>
  items.reduce<Array<{ label: string; items: ActivityItem[] }>>((groups, item) => {
    const label = getActivityGroup(item.createdAt);
    const existingGroup = groups.find((group) => group.label === label);

    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }

    return [...groups, { label, items: [item] }];
  }, []);

export const ActivityLog = ({ items }: ActivityLogProps) => (
  <Card>
    <CardHeader>
      <h2 className="text-base font-bold text-ink-strong">Latest activity</h2>
    </CardHeader>
    <CardBody>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No activity yet.</p>
      ) : (
        <div className="space-y-4">
          {groupActivityItems(items).map((group) => (
            <section key={group.label}>
              <h3 className="text-xs font-semibold uppercase text-ink-muted">{group.label}</h3>
              <ul className="mt-2 space-y-3">
                {group.items.map((item) => (
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
            </section>
          ))}
        </div>
      )}
    </CardBody>
  </Card>
);
