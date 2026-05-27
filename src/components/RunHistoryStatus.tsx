import { History } from 'lucide-react';

import { formatCloudSaveDateTime } from './cloud-saves/cloudSaveUtils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';

import type { BackendAutosaveState, RunRevisionSummary } from '../types';

type RunHistoryStatusProps = {
  autosaveState: BackendAutosaveState;
  revisions: RunRevisionSummary[];
  historyBusy: boolean;
  historyError: string | null;
  onOpenHistory: () => void;
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
  onOpenHistory,
  onRetryCloudSave,
}: RunHistoryStatusProps) => {
  const latestRevision = revisions[0];

  return (
    <Card>
      <CardHeader className="px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-strong">Version history</h2>
          <Badge tone={getSaveStateTone(autosaveState)}>{getSaveStateLabel(autosaveState)}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-2 px-4 py-2">
        <div className="rounded-control border border-surface-divider bg-surface-muted px-3 py-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-ink-strong">
              {latestRevision ? latestRevision.label : 'No restore points yet'}
            </p>
            <Badge>{revisions.length}</Badge>
          </div>
          {latestRevision ? (
            <p className="mt-1 text-xs text-ink-muted">
              Latest point saved {formatCloudSaveDateTime(latestRevision.createdAt)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Online autosave creates points you can restore.
            </p>
          )}
        </div>
        {autosaveState.status === 'error' ? (
          <div className="rounded-control border border-feedback-danger-border bg-feedback-danger-bg px-3 py-2 text-xs text-feedback-danger-fg">
            <p className="font-semibold">Online save failed. Files are still in this tab.</p>
            <p className="mt-1">
              {autosaveState.lastError ?? 'The app will retry automatically.'}
              {autosaveState.nextRetryAt
                ? ` Next retry: ${formatCloudSaveDateTime(autosaveState.nextRetryAt)}.`
                : ''}
            </p>
          </div>
        ) : null}
        {historyError ? <p className="text-xs text-feedback-danger-fg">{historyError}</p> : null}
        <div className="grid gap-2">
          <Button disabled={historyBusy} onClick={onOpenHistory}>
            <History aria-hidden="true" className="mr-2" size={17} />
            View restore points
          </Button>
          {autosaveState.status === 'error' ? (
            <Button variant="danger" onClick={onRetryCloudSave}>
              Retry online save
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
};
