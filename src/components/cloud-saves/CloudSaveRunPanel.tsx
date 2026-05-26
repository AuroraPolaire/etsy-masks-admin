import { CheckCircle2, RefreshCw } from 'lucide-react';

import { formatBytes } from '../../lib/files';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';

import type { BackendAutosaveState, BackendHealth, ManagedFile } from '../../types';
import type { BadgeTone } from '../ui/Badge';

type CloudSaveRunPanelProps = {
  health: BackendHealth | null;
  saveIdea: string;
  suggestedIdea: string;
  backendBusy: boolean;
  backendReachable: boolean;
  activeDraftRunId: string;
  autosaveState: BackendAutosaveState;
  maxFileBytes: number;
  oversizedFiles: ManagedFile[];
  onSaveIdeaChange: (idea: string) => void;
  onTestConnection: () => void;
  onFinalizeRun: () => void;
};

export const CloudSaveRunPanel = ({
  health,
  saveIdea,
  suggestedIdea,
  backendBusy,
  backendReachable,
  activeDraftRunId,
  autosaveState,
  maxFileBytes,
  oversizedFiles,
  onSaveIdeaChange,
  onTestConnection,
  onFinalizeRun,
}: CloudSaveRunPanelProps) => {
  const statusTone: BadgeTone = backendReachable ? 'success' : health ? 'warning' : 'neutral';
  const statusLabel = backendReachable
    ? 'Backend reachable'
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
      ? 'Draft autosaved'
      : autosaveState.status === 'restoring'
        ? 'Restoring draft'
        : autosaveState.status === 'saving'
          ? 'Autosaving draft'
          : autosaveState.status === 'error'
            ? 'Autosave failed'
            : 'Autosave idle';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Automatic draft save</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Each meaningful edit is saved to one backend draft for this project. Exporting a clean
              ZIP marks that draft as final.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <Badge tone={autosaveTone}>{autosaveLabel}</Badge>
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
              disabled={
                !backendReachable || backendBusy || oversizedFiles.length > 0 || !activeDraftRunId
              }
              onClick={onFinalizeRun}
            >
              <CheckCircle2 aria-hidden="true" className="mr-2" size={17} />
              Mark final
            </Button>
          </div>
        </div>
        {autosaveState.status === 'saved' && autosaveState.lastSavedAt ? (
          <p className="text-xs text-ink-muted">
            Last backend draft save:{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(autosaveState.lastSavedAt))}
          </p>
        ) : null}
        {autosaveState.status === 'restoring' ? (
          <Alert>Restoring the active backend draft before new edits are saved.</Alert>
        ) : null}
        {autosaveState.status === 'error' && autosaveState.lastError ? (
          <Alert tone="warning">{autosaveState.lastError}</Alert>
        ) : null}
        {!backendReachable && health ? (
          <Alert tone="warning">
            Backend autosave is not ready. Check the Pages Function route, Cloudflare Access, and
            D1/R2 bindings.
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
  );
};
