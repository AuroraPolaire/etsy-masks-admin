import { Sparkles } from 'lucide-react';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AIButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export const AIButton = ({
  children,
  className = '',
  type = 'button',
  ...props
}: AIButtonProps) => (
  <button
    type={type}
    className={`inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-control border border-transparent bg-[linear-gradient(135deg,rgb(var(--color-ai-from)),rgb(var(--color-ai-mid))_52%,rgb(var(--color-ai-to)))] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-brand/25 focus:ring-offset-2 focus:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    {...props}
  >
    <Sparkles aria-hidden="true" size={17} strokeWidth={2.3} />
    <span>{children}</span>
  </button>
);
