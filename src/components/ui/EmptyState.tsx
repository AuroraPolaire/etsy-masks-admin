import type { HTMLAttributes, ReactNode } from 'react';

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const EmptyState = ({ children, className = '', ...props }: EmptyStateProps) => (
  <div
    className={`rounded-panel border border-dashed border-surface-outline bg-surface-muted p-6 text-sm text-ink-muted ${className}`}
    {...props}
  >
    {children}
  </div>
);
