import type { HTMLAttributes, ReactNode } from 'react';

type SurfaceVariant = 'default' | 'muted' | 'raised';
type SurfaceElement = 'article' | 'div' | 'li';

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: SurfaceElement;
  variant?: SurfaceVariant;
  children: ReactNode;
};

const variantClasses: Record<SurfaceVariant, string> = {
  default: 'border-surface-outline bg-surface-panel',
  muted: 'border-surface-outline bg-surface-muted',
  raised: 'border-surface-outline bg-surface-raised shadow-raised',
};

export const Surface = ({
  as: Element = 'div',
  variant = 'muted',
  children,
  className = '',
  ...props
}: SurfaceProps) => (
  <Element
    className={`min-w-0 rounded-panel border ${variantClasses[variant]} ${className}`}
    {...props}
  >
    {children}
  </Element>
);
