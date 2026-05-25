import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-brand bg-brand text-ink-inverse shadow-sm hover:bg-brand-strong focus:ring-brand/25',
  secondary:
    'border-surface-outline bg-surface-raised text-ink-strong shadow-sm hover:bg-surface-muted focus:ring-brand/20',
  danger:
    'border-feedback-danger-fg bg-feedback-danger-fg text-ink-inverse shadow-sm hover:bg-feedback-danger-fg/90 focus:ring-feedback-danger-border',
  ghost:
    'border-transparent bg-transparent text-ink-base hover:bg-surface-muted focus:ring-brand/20',
};

export const Button = ({
  variant = 'secondary',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-control border px-3 py-2 text-center text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
