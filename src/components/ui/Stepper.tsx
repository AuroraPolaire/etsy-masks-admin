import { Check } from 'lucide-react';

type StepStatus = 'active' | 'available' | 'complete' | 'locked';

export type StepperItem = {
  id: string;
  title: string;
  status: StepStatus;
};

type StepperProps = {
  steps: StepperItem[];
};

const statusClasses: Record<StepStatus, string> = {
  active: 'border-brand bg-brand text-ink-inverse',
  available: 'border-brand-border bg-brand-subtle text-brand-strong',
  complete: 'border-feedback-success-border bg-feedback-success-bg text-feedback-success-fg',
  locked: 'border-surface-outline bg-surface-muted text-ink-subtle',
};

export const Stepper = ({ steps }: StepperProps) => (
  <nav
    className="rounded-panel border border-surface-outline bg-surface-panel p-3 shadow-panel"
    aria-label="Production workflow"
  >
    <ol className="grid gap-2 md:auto-cols-fr md:grid-flow-col">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2 md:flex-col md:items-start">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-badge border text-sm font-bold ${statusClasses[step.status]}`}
            aria-hidden="true"
          >
            {step.status === 'complete' ? <Check size={16} strokeWidth={2.5} /> : index + 1}
          </span>
          <span className="min-w-0 text-sm font-semibold text-ink-strong">{step.title}</span>
        </li>
      ))}
    </ol>
  </nav>
);
