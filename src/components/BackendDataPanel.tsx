import { Cloud, Database, Download, RefreshCw, Server, Shield, Trash2, Upload } from 'lucide-react';
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
  onRestoreFromCloud: () => void;
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
  onRestoreFromCloud,
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
  const updatedAt = snapshot?.updatedAt ? formatDateTime(snapshot.updatedAt) : 'Never';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Cloudflare backend</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Same-origin Worker API, Cloudflare Access authentication, D1 run cache, R2 files,
                and backend OpenAI proxy.
              </p>
            </div>
            <Badge tone={backendReachable ? 'success' : 'warning'}>
              {backendReachable ? 'Worker reachable' : 'Connection needed'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Alert tone="info">
            The frontend calls same-origin <code>/api</code> routes. Production access is managed by
            Cloudflare Access and Worker configuration, not by browser-entered secrets.
          </Alert>
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Run idea label"
              name="backendRunIdea"
              type="text"
              value={saveIdea}
              placeholder={suggestedIdea}
              helperText="Saved with each Cloudflare run so older work can be found by idea."
              onChange={(event) => onSaveIdeaChange(event.target.value)}
            />
            <Input
              label="Search saved runs"
              name="backendRunSearch"
              type="search"
              value={runSearchQuery}
              placeholder="Search by idea, project id, or run id"
              helperText="Filters the saved-run table below."
              onChange={(event) => setRunSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={backendBusy} onClick={onTestConnection}>
              <RefreshCw aria-hidden="true" className="mr-2" size={17} />
              Refresh backend
            </Button>
            <Button
              variant="primary"
              disabled={!backendReachable || backendBusy || oversizedFiles.length > 0}
              onClick={onBackupToCloud}
            >
              <Upload aria-hidden="true" className="mr-2" size={17} />
              Save run to Cloudflare
            </Button>
            <Button
              disabled={!backendReachable || backendBusy || !snapshot?.project}
              onClick={onRestoreFromCloud}
            >
              <Download aria-hidden="true" className="mr-2" size={17} />
              Restore selected run
            </Button>
          </div>
          {oversizedFiles.length > 0 ? (
            <Alert tone="warning">
              {oversizedFiles.length} file{oversizedFiles.length === 1 ? '' : 's'} exceed the{' '}
              {formatBytes(maxFileBytes)} backend limit. Remove or shrink them before cloud backup.
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-ink-strong">Saved runs</h2>
            <Badge tone="neutral">
              {filteredRuns.length}/{runs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardBody>
          {filteredRuns.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {runs.length === 0
                ? 'No saved backend runs yet.'
                : 'No saved runs match the current search.'}
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
                    <th className="py-2 pl-3 text-right font-semibold">Action</th>
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
                              {isSelected ? 'Selected' : 'Select'}
                            </Button>
                            <Button
                              disabled={backendBusy}
                              variant="primary"
                              onClick={() => onRestoreRun(run.id)}
                            >
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Surface variant="muted" className="p-4">
          <div className="flex items-start gap-3">
            <Cloud aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-strong">Selected cloud run</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-base">
                <div className="flex justify-between gap-4">
                  <dt>Idea</dt>
                  <dd className="min-w-0 truncate text-right font-semibold">
                    {getSnapshotTitle(snapshot)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Last backup</dt>
                  <dd className="font-semibold">{updatedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Saved runs</dt>
                  <dd className="font-semibold">{runs.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Files in run</dt>
                  <dd className="font-semibold">{snapshot?.files.length ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Selected R2 size</dt>
                  <dd className="font-semibold">{formatBytes(cloudTotalBytes)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Surface>

        <Surface variant="muted" className="p-4">
          <div className="flex items-start gap-3">
            <Database aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-strong">Local data in this tab</h3>
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
              </dl>
            </div>
          </div>
        </Surface>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink-strong">Data management</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Surface variant="muted" className="p-3">
              <Server aria-hidden="true" className="mb-2 text-ink-muted" size={18} />
              <p className="text-sm font-semibold text-ink-strong">D1</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Stores saved run metadata, project JSON, file metadata, and a small backend event
                log.
              </p>
            </Surface>
            <Surface variant="muted" className="p-3">
              <Database aria-hidden="true" className="mb-2 text-ink-muted" size={18} />
              <p className="text-sm font-semibold text-ink-strong">R2</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Stores uploaded and generated files for each run up to the configured per-file
                limit.
              </p>
            </Surface>
            <Surface variant="muted" className="p-3">
              <Shield aria-hidden="true" className="mb-2 text-ink-muted" size={18} />
              <p className="text-sm font-semibold text-ink-strong">Access</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Authentication belongs to Cloudflare Access and Worker verification, not browser
                token fields.
              </p>
            </Surface>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              Delete selected run removes one cached idea and its R2 files. Delete all removes every
              run, backend events, and all R2 objects.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="danger"
                disabled={!backendReachable || backendBusy || !selectedRunId}
                onClick={onDeleteSelectedRun}
              >
                <Trash2 aria-hidden="true" className="mr-2" size={17} />
                Delete selected run
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
        </CardBody>
      </Card>

      {snapshot?.events.length ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-bold text-ink-strong">Backend events</h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
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
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
};
