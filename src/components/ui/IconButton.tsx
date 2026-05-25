import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonVariant = 'secondary' | 'ghost' | 'danger' | 'success';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: IconButtonVariant;
};

const variantClasses: Record<IconButtonVariant, string> = {
  secondary:
    'border-surface-outline bg-surface-raised text-ink-base shadow-sm hover:bg-surface-muted focus:ring-brand/20',
  ghost:
    'border-transparent bg-transparent text-ink-muted hover:bg-surface-muted focus:ring-brand/20',
  danger:
    'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg hover:bg-feedback-danger-border/35 focus:ring-feedback-danger-border',
  success:
    'border-feedback-success-border bg-feedback-success-bg text-feedback-success-fg hover:bg-feedback-success-border/35 focus:ring-feedback-success-border',
};

export const IconButton = ({
  icon: Icon,
  label,
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) => (
  <button
    type={type}
    className={`inline-flex size-10 shrink-0 items-center justify-center rounded-control border transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    aria-label={label}
    title={label}
    {...props}
  >
    <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
  </button>
);
