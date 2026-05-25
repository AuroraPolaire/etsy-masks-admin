import { AlertTriangle, X } from 'lucide-react';

import { Button } from './Button';
import { IconButton } from './IconButton';

type ConfirmDialogTone = 'warning' | 'danger';

export type ConfirmDialogRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string | undefined;
  tone?: ConfirmDialogTone | undefined;
};

type ConfirmDialogProps = ConfirmDialogRequest & {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const toneClasses: Record<ConfirmDialogTone, string> = {
  warning: 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning-fg',
  danger: 'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg',
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'warning',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/35 px-4 py-6">
      <section
        className="w-full max-w-lg rounded-panel border border-surface-outline bg-surface-panel p-5 shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-control border p-2 ${toneClasses[tone]}`}>
              <AlertTriangle aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink-strong">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
            </div>
          </div>
          <IconButton icon={X} label="Close confirmation" variant="ghost" onClick={onCancel} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
};
