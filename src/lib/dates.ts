export const nowIso = (): string => new Date().toISOString();

export const formatExactDateTime = (isoValue: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoValue));

export const formatRelativeTime = (isoValue: string, now: Date = new Date()): string => {
  const date = new Date(isoValue);
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (absDiffMs < minuteMs) {
    return 'just now';
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absDiffMs < hourMs) {
    return formatter.format(Math.round(diffMs / minuteMs), 'minute');
  }

  if (absDiffMs < dayMs) {
    return formatter.format(Math.round(diffMs / hourMs), 'hour');
  }

  return formatter.format(Math.round(diffMs / dayMs), 'day');
};
