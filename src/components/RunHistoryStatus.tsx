import { History, Save } from 'lucide-react';
import { useState } from 'react';

import { formatCloudSaveDateTime } from './cloud-saves/cloudSaveUtils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';

import type { BackendAutosaveState, BusyAction, RunRevisionSummary } from '../types';

type RunHistoryStatusProps = {
  autosaveState: BackendAutosaveState;
  revisions: RunRevisionSummary[];
  historyBusy: boolean;
  historyError: string | null;
  busyAction: BusyAction;
  onOpenHistory: () => void;
  onSaveCheckpoint: (label: string) => void;
  onRetryCloudSave: () => void;
};

const getSaveStateLabel = (autosaveState: BackendAutosaveState): string => {
  if (autosaveState.status === 'saving') {
    return 'Saving';
  }

  if (autosaveState.status === 'saved') {
    return 'Saved';
  }

  if (autosaveState.status === 'restoring') {
    return 'Restoring';
  }

  if (autosaveState.status === 'error') {
    return 'Needs sync';
  }

  return 'Local only';
};

const getSaveStateTone = (autosaveState: BackendAutosaveState) => {
  if (autosaveState.status === 'saved') {
    return 'success' as const;
  }

  if (autosaveState.status === 'error') {
    return 'danger' as const;
  }

  if (autosaveState.status === 'saving' || autosaveState.status === 'restoring') {
    return 'info' as const;
  }

  return 'neutral' as const;
};

export const RunHistoryStatus = ({
  autosaveState,
  revisions,
  historyBusy,
  historyError,
  busyAction,
  onOpenHistory,
  onSaveCheckpoint,
  onRetryCloudSave,
}: RunHistoryStatusProps) => {
  const [label, setLabel] = useState('');
  const latestRevision = revisions[0];
  const canSave = busyAction === null;
  const canShowManualCheckpoint =
    autosaveState.status !== 'saving' && autosaveState.status !== 'restoring';

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-strong">Run history</h2>
          <Badge tone={getSaveStateTone(autosaveState)}>{getSaveStateLabel(autosaveState)}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-2 px-4 py-3">
        <div className="rounded-control border border-surface-divider bg-surface-muted px-3 py-1.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-ink-strong">
              {latestRevision ? latestRevision.label : 'No checkpoints yet'}
            </p>
            <Badge>{revisions.length}</Badge>
          </div>
          {latestRevision ? (
            <p className="mt-1 text-xs text-ink-muted">
              {formatCloudSaveDateTime(latestRevision.createdAt)}
            </p>
          ) : null}
        </div>
        {autosaveState.status === 'error' ? (
          <div className="rounded-control border border-feedback-danger-border bg-feedback-danger-bg px-3 py-2 text-xs text-feedback-danger-fg">
            <p className="font-semibold">Cloud save failed. Files are still in this tab.</p>
            <p className="mt-1">
              {autosaveState.lastError ?? 'The app will retry automatically.'}
              {autosaveState.nextRetryAt
                ? ` Next retry: ${formatCloudSaveDateTime(autosaveState.nextRetryAt)}.`
                : ''}
            </p>
          </div>
        ) : null}
        {historyError ? <p className="text-xs text-feedback-danger-fg">{historyError}</p> : null}
        {canShowManualCheckpoint ? (
          <details className="rounded-control border border-surface-divider bg-surface-muted">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink-strong">
              Manual checkpoint
            </summary>
            <div className="space-y-2 border-t border-surface-divider p-3">
              <Input
                label="Checkpoint label"
                name="checkpointLabel"
                value={label}
                placeholder="Before redoing slogans"
                helperText="Manual checkpoints stay pinned in history."
                onChange={(event) => setLabel(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={!canSave || historyBusy}
                variant="primary"
                onClick={() => {
                  onSaveCheckpoint(label.trim() || 'Manual checkpoint');
                  setLabel('');
                }}
              >
                <Save aria-hidden="true" className="mr-2" size={17} />
                Save checkpoint
              </Button>
            </div>
          </details>
        ) : null}
        <div className="grid gap-2">
          <Button disabled={historyBusy} onClick={onOpenHistory}>
            <History aria-hidden="true" className="mr-2" size={17} />
            History
          </Button>
          {autosaveState.status === 'error' ? (
            <Button disabled={!canSave} variant="danger" onClick={onRetryCloudSave}>
              Retry cloud save
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
};
