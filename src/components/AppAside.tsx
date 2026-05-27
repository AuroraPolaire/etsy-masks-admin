import { RunHistoryStatus } from './RunHistoryStatus';
import { WorkflowStatus } from './WorkflowStatus';

import type { BackendAutosaveState, BusyAction, QAResult, RunRevisionSummary } from '../types';
import type { WorkflowState } from '../workflow/workflowState';

type AppAsideProps = {
  workflow: WorkflowState;
  qaResult: QAResult;
  busyAction: BusyAction;
  busyProgress: string | null;
  autosaveState: BackendAutosaveState;
  runRevisions: RunRevisionSummary[];
  historyBusy: boolean;
  historyError: string | null;
  onCancelBusyAction: () => void;
  onOpenHistory: () => void;
  onSaveCheckpoint: (label: string) => void;
  onRetryCloudSave: () => void;
};

export const AppAside = ({
  workflow,
  qaResult,
  busyAction,
  busyProgress,
  autosaveState,
  runRevisions,
  historyBusy,
  historyError,
  onCancelBusyAction,
  onOpenHistory,
  onSaveCheckpoint,
  onRetryCloudSave,
}: AppAsideProps) => (
  <aside
    aria-label="Workflow summary"
    className="min-w-0 space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-4 lg:pr-2 lg:[scrollbar-gutter:stable]"
  >
    <WorkflowStatus
      workflow={workflow}
      qaResult={qaResult}
      busyAction={busyAction}
      busyProgress={busyProgress}
      onCancelBusyAction={onCancelBusyAction}
    />
    <RunHistoryStatus
      autosaveState={autosaveState}
      revisions={runRevisions}
      historyBusy={historyBusy}
      historyError={historyError}
      busyAction={busyAction}
      onOpenHistory={onOpenHistory}
      onSaveCheckpoint={onSaveCheckpoint}
      onRetryCloudSave={onRetryCloudSave}
    />
  </aside>
);
