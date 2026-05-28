import { History } from 'lucide-react';

import { formatCloudSaveDateTime } from './cloud-saves/cloudSaveUtils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

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
    <Card className="border-surface-divider bg-surface-panel/80 shadow-none">
      <CardBody className="space-y-2 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink-strong">Saved automatically</h2>
            <p className="mt-1 truncate text-xs text-ink-muted">
              {latestRevision
                ? `Latest version: ${formatCloudSaveDateTime(latestRevision.createdAt)}`
                : 'Previous versions appear after the first online save.'}
            </p>
          </div>
          <Badge tone={getSaveStateTone(autosaveState)}>{getSaveStateLabel(autosaveState)}</Badge>
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">{revisions.length} saved version(s)</p>
          <Button
            disabled={historyBusy}
            variant="ghost"
            className="min-h-9 px-2 py-1"
            onClick={onOpenHistory}
          >
            <History aria-hidden="true" className="mr-2" size={17} />
            Previous versions
          </Button>
        </div>
        <div className="grid gap-2">
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
