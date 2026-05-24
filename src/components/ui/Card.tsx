import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Card = ({ children, className = '', ...props }: CardProps) => (
  <section
    className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    {...props}
  >
    {children}
  </section>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={`border-b border-slate-200 px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }: CardProps) => (
  <div className={`px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);
