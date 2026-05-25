import type { HTMLAttributes, ReactNode } from 'react';

type AlertTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type AlertDensity = 'default' | 'compact';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  density?: AlertDensity;
  children: ReactNode;
};

const toneClasses: Record<AlertTone, string> = {
  neutral: 'border-surface-outline bg-surface-muted text-ink-base',
  brand: 'border-brand-border bg-brand-subtle text-brand-strong',
  success: 'border-feedback-success-border bg-feedback-success-bg text-feedback-success-fg',
  warning: 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning-fg',
  danger: 'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg',
  info: 'border-feedback-info-border bg-feedback-info-bg text-feedback-info-fg',
};

const densityClasses: Record<AlertDensity, string> = {
  default: 'p-3',
  compact: 'p-2',
};

export const Alert = ({
  tone = 'neutral',
  density = 'default',
  children,
  className = '',
  ...props
}: AlertProps) => (
  <div
    className={`rounded-control border text-sm leading-6 ${toneClasses[tone]} ${densityClasses[density]} ${className}`}
    {...props}
  >
    {children}
  </div>
);
