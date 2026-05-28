import { RefreshCw } from 'lucide-react';

import { formatBytes } from '../../lib/files';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Surface } from '../ui/Surface';

import type { BackendAutosaveState, BackendHealth, ManagedFile } from '../../types';
import type { BadgeTone } from '../ui/Badge';

type CloudSaveRunPanelProps = {
  health: BackendHealth | null;
  saveIdea: string;
  suggestedIdea: string;
  backendBusy: boolean;
  backendReachable: boolean;
  autosaveState: BackendAutosaveState;
  maxFileBytes: number;
  oversizedFiles: ManagedFile[];
  onTestConnection: () => void;
};

export const CloudSaveRunPanel = ({
  health,
  saveIdea,
  suggestedIdea,
  backendBusy,
  backendReachable,
  autosaveState,
  maxFileBytes,
  oversizedFiles,
  onTestConnection,
}: CloudSaveRunPanelProps) => {
  const statusTone: BadgeTone = backendReachable ? 'success' : health ? 'warning' : 'neutral';
  const statusLabel = backendReachable
    ? 'Online save ready'
    : health
      ? 'Needs attention'
      : 'Not checked';
  const autosaveTone: BadgeTone =
    autosaveState.status === 'saved'
      ? 'success'
      : autosaveState.status === 'error'
        ? 'warning'
        : autosaveState.status === 'restoring'
          ? 'neutral'
          : autosaveState.status === 'saving'
            ? 'neutral'
            : 'neutral';
  const autosaveLabel =
    autosaveState.status === 'saved'
      ? 'Autosaved'
      : autosaveState.status === 'restoring'
        ? 'Restoring'
        : autosaveState.status === 'saving'
          ? 'Autosaving'
          : autosaveState.status === 'error'
            ? 'Autosave failed'
            : 'Autosave idle';
  const runName = saveIdea.trim() || suggestedIdea;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Automatic online save</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Each meaningful edit is saved to one online copy for this project. There is no manual
              save step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <Badge tone={autosaveTone}>{autosaveLabel}</Badge>
            <Badge tone={health?.openaiProxyReady ? 'success' : 'warning'}>
              {health?.openaiProxyReady ? 'AI image service ready' : 'AI setup needed'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <Surface variant="muted" className="p-3">
            <p className="text-xs font-semibold uppercase text-ink-muted">Saved as</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink-strong">{runName}</p>
            <p className="mt-1 text-xs text-ink-muted">
              The name follows the current project and stays searchable in saved projects.
            </p>
          </Surface>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={backendBusy} onClick={onTestConnection}>
              <RefreshCw aria-hidden="true" className="mr-2" size={17} />
              Refresh
            </Button>
          </div>
        </div>
        {autosaveState.status === 'saved' && autosaveState.lastSavedAt ? (
          <p className="text-xs text-ink-muted">
            Last online save:{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(autosaveState.lastSavedAt))}
          </p>
        ) : null}
        {autosaveState.status === 'restoring' ? (
          <Alert>Restoring the active saved copy before new edits are saved.</Alert>
        ) : null}
        {autosaveState.status === 'error' && autosaveState.lastError ? (
          <Alert tone="warning">{autosaveState.lastError}</Alert>
        ) : null}
        {!backendReachable && health ? (
          <Alert tone="warning">
            Online autosave is not ready. Refresh again or ask an admin to check the saved-work
            setup.
          </Alert>
        ) : null}
        {oversizedFiles.length > 0 ? (
          <Alert tone="warning">
            {oversizedFiles.length} file{oversizedFiles.length === 1 ? '' : 's'} exceed the{' '}
            {formatBytes(maxFileBytes)} online-save limit. Remove or shrink them before saving.
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
};
