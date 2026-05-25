import { Cloud, Database, Download, RefreshCw, Server, Shield, Trash2, Upload } from 'lucide-react';

import { formatBytes } from '../lib/files';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';

import type {
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyAction,
  ManagedFile,
} from '../types';

export type BackendSettings = {
  apiBaseUrl: string;
  adminToken: string;
};

type BackendDataPanelProps = {
  settings: BackendSettings;
  health: BackendHealth | null;
  runs: BackendRunSummary[];
  selectedRunId: string;
  snapshot: BackendProjectSnapshot | null;
  saveIdea: string;
  suggestedIdea: string;
  files: ManagedFile[];
  busyAction: BusyAction;
  onSettingsChange: (settings: BackendSettings) => void;
  onSaveIdeaChange: (idea: string) => void;
  onRunSelected: (runId: string) => void;
  onTestConnection: () => void;
  onBackupToCloud: () => void;
  onRestoreFromCloud: () => void;
  onDeleteSelectedRun: () => void;
  onDeleteAllCloudData: () => void;
};

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

export const BackendDataPanel = ({
  settings,
  health,
  runs,
  selectedRunId,
  snapshot,
  saveIdea,
  suggestedIdea,
  files,
  busyAction,
  onSettingsChange,
  onSaveIdeaChange,
  onRunSelected,
  onTestConnection,
  onBackupToCloud,
  onRestoreFromCloud,
  onDeleteSelectedRun,
  onDeleteAllCloudData,
}: BackendDataPanelProps) => {
  const backendBusy = busyAction === 'backend-sync';
  const hasConnectionSettings =
    settings.apiBaseUrl.trim().length > 0 && settings.adminToken.trim().length > 0;
  const localTotalBytes = files.reduce((total, file) => total + file.size, 0);
  const maxFileBytes = health?.maxFileBytes ?? 50 * 1024 * 1024;
  const oversizedFiles = files.filter((file) => file.size > maxFileBytes);
  const cloudTotalBytes = snapshot?.files.reduce((total, file) => total + file.size, 0) ?? 0;
  const runOptions = [
    { value: '', label: runs.length ? 'Select a saved run' : 'No saved runs yet' },
    ...runs.map((run) => ({
      value: run.id,
      label: `${run.idea} - ${new Date(run.updatedAt).toLocaleString()}`,
    })),
  ];
  const updatedAt = snapshot?.updatedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(snapshot.updatedAt))
    : 'Never';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Cloudflare backend</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Optional D1/R2 run cache and OpenAI proxy for the GitHub Pages app.
              </p>
            </div>
            <Badge tone={health?.ok ? 'success' : 'warning'}>
              {health?.ok ? 'Worker reachable' : 'Not connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Input
              label="Worker API URL"
              name="backendApiBaseUrl"
              type="url"
              value={settings.apiBaseUrl}
              placeholder="https://etsy-masks-admin-api.<account>.workers.dev"
              helperText="Stored in this browser so GitHub Pages can call the Worker."
              onChange={(event) =>
                onSettingsChange({ ...settings, apiBaseUrl: event.target.value })
              }
            />
            <Input
              label="Admin token"
              name="backendAdminToken"
              type="password"
              autoComplete="off"
              value={settings.adminToken}
              helperText="Kept in React state for this tab only. It is not persisted."
              onChange={(event) =>
                onSettingsChange({ ...settings, adminToken: event.target.value })
              }
            />
          </div>
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
            <Select
              label="Saved backend run"
              name="backendRun"
              value={selectedRunId}
              options={runOptions}
              helperText="Selecting a run loads its metadata and files for restore."
              disabled={!hasConnectionSettings || backendBusy || runs.length === 0}
              onChange={(event) => onRunSelected(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!settings.apiBaseUrl.trim() || backendBusy}
              onClick={onTestConnection}
            >
              <RefreshCw aria-hidden="true" className="mr-2" size={17} />
              Test connection
            </Button>
            <Button
              variant="primary"
              disabled={!hasConnectionSettings || backendBusy || oversizedFiles.length > 0}
              onClick={onBackupToCloud}
            >
              <Upload aria-hidden="true" className="mr-2" size={17} />
              Save run to Cloudflare
            </Button>
            <Button
              disabled={!hasConnectionSettings || backendBusy || !snapshot?.project}
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Surface variant="muted" className="p-4">
          <div className="flex items-start gap-3">
            <Cloud aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-strong">Cloud data stored</h3>
              <dl className="mt-3 grid gap-2 text-sm text-ink-base">
                <div className="flex justify-between gap-4">
                  <dt>Selected run</dt>
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
                  <dt>Auth secret</dt>
                  <dd className="font-semibold">
                    {health?.authConfigured ? 'Configured' : 'Missing'}
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
              <p className="text-sm font-semibold text-ink-strong">Secrets</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                The admin token and OpenAI key live as Worker secrets, not in GitHub Pages.
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
                disabled={!hasConnectionSettings || backendBusy || !selectedRunId}
                onClick={onDeleteSelectedRun}
              >
                <Trash2 aria-hidden="true" className="mr-2" size={17} />
                Delete selected run
              </Button>
              <Button
                variant="danger"
                disabled={!hasConnectionSettings || backendBusy || runs.length === 0}
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
