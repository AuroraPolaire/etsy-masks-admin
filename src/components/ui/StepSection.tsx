import { Lock, Pencil } from 'lucide-react';

import { Badge } from './Badge';
import { Button } from './Button';

import type { ReactNode } from 'react';

export type StepSectionState = 'active' | 'available' | 'complete' | 'locked';

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
      <section>
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-panel border border-surface-outline bg-surface-panel p-4 text-left shadow-panel transition hover:border-brand-border hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/25 focus:ring-offset-2 focus:ring-offset-surface-panel"
          onClick={onActivate}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-feedback-success-border bg-feedback-success-bg text-sm font-bold text-feedback-success-fg">
            {number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-ink-strong">{title}</h2>
              <Badge tone="success">Done</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{summary}</p>
          </div>
          <Pencil aria-hidden="true" className="ml-auto shrink-0 text-ink-muted" size={18} />
        </button>
      </section>
    );
  }

  if (state === 'available') {
    return (
      <section>
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-panel border border-surface-outline bg-surface-panel p-4 text-left shadow-panel transition hover:border-brand-border hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/25 focus:ring-offset-2 focus:ring-offset-surface-panel"
          onClick={onActivate}
        >
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
          <span className="pointer-events-none ml-auto inline-flex min-h-10 shrink-0 items-center justify-center rounded-control border border-surface-outline bg-surface-raised px-3 py-2 text-center text-sm font-semibold text-ink-strong shadow-sm">
            Open
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="workflow-reveal space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-badge border border-brand bg-brand text-sm font-bold text-ink-inverse">
          {number}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
            <Badge tone="info">Now</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      {children}
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
  <div className="sticky bottom-3 z-20 mt-5 flex justify-stretch sm:static sm:justify-end">
    <Button
      className="w-full shadow-panel sm:w-auto"
      variant="primary"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  </div>
);
