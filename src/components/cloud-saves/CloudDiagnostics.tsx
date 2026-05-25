import { Cloud, Database } from 'lucide-react';

import { formatBytes } from '../../lib/files';
import { Surface } from '../ui/Surface';

import type { BackendEvent, BackendHealth, BackendRunSummary, ManagedFile } from '../../types';

type CloudDiagnosticsProps = {
  health: BackendHealth | null;
  runs: BackendRunSummary[];
  files: ManagedFile[];
  localTotalBytes: number;
  cloudTotalBytes: number;
  maxFileBytes: number;
  events: BackendEvent[];
};

export const CloudDiagnostics = ({
  health,
  runs,
  files,
  localTotalBytes,
  cloudTotalBytes,
  maxFileBytes,
  events,
}: CloudDiagnosticsProps) => (
  <details className="rounded-control border border-surface-outline bg-surface-panel">
    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ink-strong">
      Diagnostics
    </summary>
    <div className="space-y-4 border-t border-surface-divider p-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Surface variant="muted" className="p-4">
          <div className="flex items-start gap-3">
            <Cloud aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-strong">Cloud status</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-base">
                <div className="flex justify-between gap-4">
                  <dt>Saved runs</dt>
                  <dd className="font-semibold">{runs.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>OpenAI proxy</dt>
                  <dd className="font-semibold">
                    {health?.openaiProxyReady ? 'Ready' : 'Not configured'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Access auth</dt>
                  <dd className="font-semibold">
                    {health?.auth.configured ? health.auth.mode : 'Missing'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>File limit</dt>
                  <dd className="font-semibold">{formatBytes(maxFileBytes)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Surface>

        <Surface variant="muted" className="p-4">
          <div className="flex items-start gap-3">
            <Database aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-strong">Data in this tab</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-base">
                <div className="flex justify-between gap-4">
                  <dt>Session files</dt>
                  <dd className="font-semibold">{files.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Session size</dt>
                  <dd className="font-semibold">{formatBytes(localTotalBytes)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Previewed run size</dt>
                  <dd className="font-semibold">{formatBytes(cloudTotalBytes)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Surface>
      </div>

      {events.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-ink-strong">Recent backend events</h3>
          <ul className="mt-3 space-y-2">
            {events.slice(0, 5).map((event) => (
              <li
                key={event.id}
                className="rounded-control border border-surface-outline bg-surface-muted px-3 py-2 text-sm"
              >
                <p className="font-semibold text-ink-strong">{event.message}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {event.type} - {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  </details>
);
