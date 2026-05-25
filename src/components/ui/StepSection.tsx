import { Lock, Pencil } from 'lucide-react';

import { Badge } from './Badge';
import { Button } from './Button';
import { IconButton } from './IconButton';

import type { ReactNode } from 'react';

type StepSectionState = 'active' | 'available' | 'complete' | 'locked';

type StepSectionProps = {
  number: number;
  title: string;
  description: string;
  state: StepSectionState;
  summary: string;
  lockedReason?: string | undefined;
  children: ReactNode;
  onActivate: () => void;
};

export const StepSection = ({
  number,
  title,
  description,
  state,
  summary,
  lockedReason,
  children,
  onActivate,
}: StepSectionProps) => {
  if (state === 'locked') {
    return (
      <section className="rounded-panel border border-dashed border-surface-outline bg-surface-muted p-4 text-ink-muted">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-surface-outline bg-surface-raised text-sm font-bold text-ink-subtle">
            {number}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-ink-base">{title}</h2>
              <Badge tone="neutral">Locked</Badge>
            </div>
            <p className="mt-1 text-sm">{lockedReason ?? description}</p>
          </div>
          <Lock aria-hidden="true" className="ml-auto shrink-0 text-ink-subtle" size={18} />
        </div>
      </section>
    );
  }

  if (state === 'complete') {
    return (
      <section className="rounded-panel border border-surface-outline bg-surface-panel p-4 shadow-panel">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-feedback-success-border bg-feedback-success-bg text-sm font-bold text-feedback-success-fg">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-ink-strong">{title}</h2>
              <Badge tone="success">Complete</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{summary}</p>
          </div>
          <IconButton icon={Pencil} label={`Edit ${title}`} variant="ghost" onClick={onActivate} />
        </div>
      </section>
    );
  }

  if (state === 'available') {
    return (
      <section className="rounded-panel border border-surface-outline bg-surface-panel p-4 shadow-panel">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-brand-border bg-brand-subtle text-sm font-bold text-brand-strong">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-ink-strong">{title}</h2>
              <Badge tone="info">Ready</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{summary}</p>
          </div>
          <Button onClick={onActivate}>Open</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="workflow-reveal rounded-panel border border-brand-border bg-surface-panel shadow-panel">
      <div className="border-b border-surface-divider px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-brand bg-brand text-sm font-bold text-ink-inverse">
            {number}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
              <Badge tone="info">Current step</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
};

export const StepAdvanceButton = ({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <div className="mt-5 flex justify-end">
    <Button variant="primary" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  </div>
);
