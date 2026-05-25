import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
};

export const StatCard = ({ label, value }: StatCardProps) => (
  <div className="rounded-control border border-surface-outline bg-surface-muted p-3 text-center">
    <dt className="text-xs text-ink-muted">{label}</dt>
    <dd className="mt-1 font-bold text-ink-strong">{value}</dd>
  </div>
);
