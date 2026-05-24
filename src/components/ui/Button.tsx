import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-teal-500/70 bg-teal-700/90 text-white shadow-sm hover:bg-teal-800 focus:ring-teal-700',
  secondary:
    'border-white/70 bg-white/65 text-slate-900 shadow-sm backdrop-blur-md hover:bg-white/85 focus:ring-slate-500',
  danger:
    'border-red-600/70 bg-red-700/90 text-white shadow-sm hover:bg-red-800 focus:ring-red-700',
  ghost:
    'border-transparent bg-white/20 text-slate-700 backdrop-blur-md hover:bg-white/55 focus:ring-slate-500',
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
    className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white/60 disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
