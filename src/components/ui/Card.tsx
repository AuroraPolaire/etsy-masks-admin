import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Card = ({ children, className = '', ...props }: CardProps) => (
  <section
    className={`min-w-0 rounded-panel border border-surface-outline bg-surface-panel shadow-panel ${className}`}
    {...props}
  >
    {children}
  </section>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={`border-b border-surface-divider px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }: CardProps) => (
  <div className={`px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);
