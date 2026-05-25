import { Cloud, Database, Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatBytes } from '../lib/files';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';

import type {
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyAction,
  ManagedFile,
} from '../types';

type BackendDataPanelProps = {
  health: BackendHealth | null;
  runs: BackendRunSummary[];
  selectedRunId: string;
  snapshot: BackendProjectSnapshot | null;
  saveIdea: string;
  suggestedIdea: string;
  files: ManagedFile[];
  busyAction: BusyAction;
  onSaveIdeaChange: (idea: string) => void;
  onRunSelected: (runId: string) => void;
  onRestoreRun: (runId: string) => void;
  onTestConnection: () => void;
  onBackupToCloud: () => void;
  onDeleteSelectedRun: () => void;
  onDeleteAllCloudData: () => void;
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const getSnapshotTitle = (snapshot: BackendProjectSnapshot | null): string => {
  if (snapshot?.idea?.trim()) {
    return snapshot.idea;
  }

  const title = snapshot?.project?.settings.title.trim();
  if (title) {
    return title;
  }

  return snapshot?.project ? 'Untitled project' : 'No selected run';
};

const filterRuns = (runs: BackendRunSummary[], query: string): BackendRunSummary[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return runs;
  }

  return runs.filter((run) =>
    [run.idea, run.projectId, run.id].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
};

export const BackendDataPanel = ({
  health,
  runs,
  selectedRunId,
  snapshot,
  saveIdea,
  suggestedIdea,
  files,
  busyAction,
  onSaveIdeaChange,
  onRunSelected,
  onRestoreRun,
  onTestConnection,
  onBackupToCloud,
  onDeleteSelectedRun,
  onDeleteAllCloudData,
}: BackendDataPanelProps) => {
  const [runSearchQuery, setRunSearchQuery] = useState('');
  const backendBusy = busyAction === 'backend-sync';
  const backendReachable = Boolean(health?.ok);
  const localTotalBytes = files.reduce((total, file) => total + file.size, 0);
  const maxFileBytes = health?.maxFileBytes ?? 50 * 1024 * 1024;
  const oversizedFiles = files.filter((file) => file.size > maxFileBytes);
  const cloudTotalBytes = snapshot?.files.reduce((total, file) => total + file.size, 0) ?? 0;
  const filteredRuns = useMemo(() => filterRuns(runs, runSearchQuery), [runSearchQuery, runs]);
  const selectedRun = runs.find((run) => run.id === selectedRunId);
  const updatedAt = snapshot?.updatedAt ? formatDateTime(snapshot.updatedAt) : 'Never';
  const statusTone = backendReachable ? 'success' : health ? 'warning' : 'neutral';
  const statusLabel = backendReachable
    ? 'Cloud saves reachable'
    : health
      ? 'Needs attention'
      : 'Not checked';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Save current run</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Store the current brief, topics, approved files, PDFs, and previews so this run can
                be restored later.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone}>{statusLabel}</Badge>
              <Badge tone={health?.openaiProxyReady ? 'success' : 'warning'}>
                {health?.openaiProxyReady ? 'AI ready' : 'AI not ready'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Input
              label="Run idea label"
              name="backendRunIdea"
              type="text"
              value={saveIdea}
              placeholder={suggestedIdea}
              helperText="Use a short idea name that will be easy to find later."
              onChange={(event) => onSaveIdeaChange(event.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={backendBusy} onClick={onTestConnection}>
                <RefreshCw aria-hidden="true" className="mr-2" size={17} />
                Refresh
              </Button>
              <Button
                variant="primary"
                disabled={!backendReachable || backendBusy || oversizedFiles.length > 0}
                onClick={onBackupToCloud}
              >
                <Upload aria-hidden="true" className="mr-2" size={17} />
                Save run
              </Button>
            </div>
          </div>
          {!backendReachable && health ? (
            <Alert tone="warning">
              Cloud saves are not ready. Check the Worker route, Cloudflare Access, and D1/R2
              bindings.
            </Alert>
          ) : null}
          {oversizedFiles.length > 0 ? (
            <Alert tone="warning">
              {oversizedFiles.length} file{oversizedFiles.length === 1 ? '' : 's'} exceed the{' '}
              {formatBytes(maxFileBytes)} cloud-save limit. Remove or shrink them before saving.
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-strong">Saved runs</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Search by idea, check the high-level details, then restore the run you want.
              </p>
            </div>
            <div className="w-full lg:max-w-sm">
              <Input
                label="Search saved runs"
                name="backendRunSearch"
                type="search"
                value={runSearchQuery}
                placeholder="Idea, project id, or run id"
                helperText={`${filteredRuns.length}/${runs.length} runs shown`}
                onChange={(event) => setRunSearchQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {filteredRuns.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {runs.length === 0 ? 'No saved cloud runs yet.' : 'No saved runs match the search.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-divider text-xs uppercase text-ink-muted">
                    <th className="py-2 pr-3 font-semibold">Idea</th>
                    <th className="px-3 py-2 font-semibold">Updated</th>
                    <th className="px-3 py-2 text-right font-semibold">Files</th>
                    <th className="px-3 py-2 text-right font-semibold">Size</th>
                    <th className="py-2 pl-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((run) => {
                    const isSelected = run.id === selectedRunId;

                    return (
                      <tr
                        key={run.id}
                        className={`border-b border-surface-divider ${
                          isSelected ? 'bg-brand-subtle' : ''
                        }`}
                      >
                        <td className="max-w-80 py-3 pr-3">
                          <p className="truncate font-semibold text-ink-strong">{run.idea}</p>
                          <p className="mt-1 truncate text-xs text-ink-muted">
                            {run.projectId} / {run.id}
                          </p>
                        </td>
                        <td className="p-3 text-ink-base">{formatDateTime(run.updatedAt)}</td>
                        <td className="p-3 text-right text-ink-base">{run.fileCount}</td>
                        <td className="p-3 text-right text-ink-base">
                          {formatBytes(run.totalSizeBytes)}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              disabled={backendBusy}
                              variant={isSelected ? 'primary' : 'secondary'}
                              onClick={() => onRunSelected(run.id)}
                            >
                              {isSelected ? 'Previewing' : 'Preview'}
                            </Button>
                            <Button
                              disabled={backendBusy}
                              variant="primary"
                              onClick={() => onRestoreRun(run.id)}
                            >
                              <Download aria-hidden="true" className="mr-2" size={17} />
                              Restore
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Surface variant="muted" className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink-strong">Previewed run</h3>
            <dl className="mt-3 grid gap-2 text-sm text-ink-base sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-ink-muted">Idea</dt>
                <dd className="mt-1 truncate font-semibold">{getSnapshotTitle(snapshot)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-muted">Last saved</dt>
                <dd className="mt-1 font-semibold">{updatedAt}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-muted">Files</dt>
                <dd className="mt-1 font-semibold">{snapshot?.files.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-muted">Size</dt>
                <dd className="mt-1 font-semibold">{formatBytes(cloudTotalBytes)}</dd>
              </div>
            </dl>
          </div>
          <Button
            disabled={!backendReachable || backendBusy || !snapshot?.project}
            onClick={() => {
              if (selectedRunId) {
                onRestoreRun(selectedRunId);
              }
            }}
          >
            <Download aria-hidden="true" className="mr-2" size={17} />
            Restore previewed run
          </Button>
        </div>
      </Surface>

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

          {snapshot?.events.length ? (
            <div>
              <h3 className="text-sm font-bold text-ink-strong">Recent backend events</h3>
              <ul className="mt-3 space-y-2">
                {snapshot.events.slice(0, 5).map((event) => (
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

      <details className="rounded-control border border-feedback-danger-border bg-feedback-danger-bg">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-feedback-danger-fg">
          Danger zone
        </summary>
        <div className="space-y-4 border-t border-feedback-danger-border p-4">
          <p className="text-sm text-feedback-danger-fg">
            Delete selected run removes one saved idea and its files. Delete all cloud data removes
            every saved run, backend event, and R2 object.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="danger"
              disabled={!backendReachable || backendBusy || !selectedRun}
              onClick={onDeleteSelectedRun}
            >
              <Trash2 aria-hidden="true" className="mr-2" size={17} />
              Delete previewed run
            </Button>
            <Button
              variant="danger"
              disabled={!backendReachable || backendBusy || runs.length === 0}
              onClick={onDeleteAllCloudData}
            >
              <Trash2 aria-hidden="true" className="mr-2" size={17} />
              Delete all cloud data
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
};
