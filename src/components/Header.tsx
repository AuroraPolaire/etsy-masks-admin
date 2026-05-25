import { Badge } from './ui/Badge';

import type { QAResult } from '../types';

type HeaderProps = {
  qaResult: QAResult;
};

export const Header = ({ qaResult }: HeaderProps) => (
  <header className="border-b border-surface-divider bg-surface-panel/95 backdrop-blur">
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
          Printable mask studio
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-strong md:text-3xl">Mask Bundle Studio</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Plan, generate, review, and export a complete Etsy-ready mask bundle in one browser-only
          workspace.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={qaResult.status === 'etsy-ready' ? 'success' : 'warning'}>
          {qaResult.status === 'etsy-ready' ? 'Etsy-ready' : 'Needs review'}
        </Badge>
        <Badge tone="info">{qaResult.readinessPercentage}% ready</Badge>
      </div>
    </div>
  </header>
);
