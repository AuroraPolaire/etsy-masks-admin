import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export const Card = ({ children, className = '', ...props }: CardProps) => (
  <section
    className={`rounded-lg border border-white/60 bg-white/65 shadow-panel ring-1 ring-slate-900/5 backdrop-blur-xl ${className}`}
    {...props}
  >
    {children}
  </section>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={`border-b border-white/60 px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }: CardProps) => (
  <div className={`px-5 py-4 ${className}`} {...props}>
    {children}
  </div>
);
