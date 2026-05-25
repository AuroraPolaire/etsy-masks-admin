import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IconButton } from './IconButton';
import { ToastContext } from './toastContext';

import type { ToastInput, ToastTone } from './toastContext';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type ToastItem = ToastInput & {
  id: string;
};

const toneClasses: Record<ToastTone, string> = {
  info: 'border-feedback-info-border bg-feedback-info-bg text-feedback-info-fg',
  success: 'border-feedback-success-border bg-feedback-success-bg text-feedback-success-fg',
  warning: 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning-fg',
  error: 'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg',
};

const toneIcons: Record<ToastTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);

  const showToast = useCallback((toast: ToastInput) => {
    setQueue((items) => [...items, { ...toast, id: crypto.randomUUID() }]);
  }, []);

  const dismissToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  useEffect(() => {
    if (currentToast || queue.length === 0) {
      return;
    }

    const [nextToast, ...nextQueue] = queue;
    setCurrentToast(nextToast ?? null);
    setQueue(nextQueue);
  }, [currentToast, queue]);

  useEffect(() => {
    if (!currentToast || currentToast.tone === 'error') {
      return;
    }

    const timeoutId = window.setTimeout(dismissToast, 5200);
    return () => window.clearTimeout(timeoutId);
  }, [currentToast, dismissToast]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toast={currentToast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

const ToastViewport = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem | null;
  onDismiss: () => void;
}) => {
  if (!toast) {
    return null;
  }

  const Icon = toneIcons[toast.tone];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end">
      <div
        className={`workflow-reveal pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-panel border p-4 shadow-panel ${toneClasses[toast.tone]}`}
        role={toast.tone === 'error' ? 'alert' : 'status'}
      >
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{toast.title}</p>
          <p className="mt-1 text-sm leading-5">{toast.message}</p>
        </div>
        <IconButton icon={X} label="Dismiss notification" variant="ghost" onClick={onDismiss} />
      </div>
    </div>
  );
};
