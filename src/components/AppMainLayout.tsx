import type { ReactNode } from 'react';

type AppMainLayoutProps = {
  children: ReactNode;
  aside: ReactNode;
};

export const AppMainLayout = ({ children, aside }: AppMainLayoutProps) => (
  <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
    <div className="min-w-0 space-y-6">{children}</div>
    {aside}
  </main>
);
