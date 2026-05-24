import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800 focus:ring-teal-700',
  secondary: 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-500',
  danger: 'border-red-700 bg-red-700 text-white hover:bg-red-800 focus:ring-red-700',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500',
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
    className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
