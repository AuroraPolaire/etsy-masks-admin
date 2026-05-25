import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

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

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (element: HTMLElement | null): HTMLElement[] => {
  if (!element) {
    return [];
  }

  return Array.from(element.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (focusableElement) => !focusableElement.hasAttribute('aria-hidden'),
  );
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
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableElements = getFocusableElements(dialogRef.current);
    const initialFocusElement =
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ??
      focusableElements[0] ??
      dialogRef.current;
    initialFocusElement?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/35 px-4 py-6">
      <section
        ref={dialogRef}
        className="w-full max-w-lg rounded-panel border border-surface-outline bg-surface-panel p-5 shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-control border p-2 ${toneClasses[tone]}`}>
              <AlertTriangle aria-hidden="true" size={20} />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-bold text-ink-strong">
                {title}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-ink-muted">
                {description}
              </p>
            </div>
          </div>
          <IconButton icon={X} label="Close confirmation" variant="ghost" onClick={onCancel} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button data-autofocus="true" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
};
