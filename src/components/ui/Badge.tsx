import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-surface-outline bg-surface-muted text-ink-base',
  success: 'border-feedback-success-border bg-feedback-success-bg text-feedback-success-fg',
  warning: 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning-fg',
  danger: 'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg',
  info: 'border-feedback-info-border bg-feedback-info-bg text-feedback-info-fg',
};

export const Badge = ({ tone = 'neutral', children }: BadgeProps) => (
  <span
    className={`inline-flex items-center rounded-badge border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}
  >
    {children}
  </span>
);
