import type { QAResult } from '../types';
import { Badge } from './ui/Badge';

type HeaderProps = {
  qaResult: QAResult;
};

export const Header = ({ qaResult }: HeaderProps) => (
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Static Etsy workflow
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">Mask Bundle Admin</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Prepare prompts, review uploaded masks, generate printable PDFs, create preview images, and
          export a ready-to-review archive without a backend.
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
