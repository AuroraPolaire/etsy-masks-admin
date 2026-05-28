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
  showSavedStatus?: boolean;
  onCancelBusyAction: () => void;
  onOpenHistory: () => void;
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
  showSavedStatus = true,
  onCancelBusyAction,
  onOpenHistory,
  onRetryCloudSave,
}: AppAsideProps) => (
  <aside
    aria-label="Workflow summary"
    className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-4 lg:pr-2 lg:[scrollbar-gutter:stable]"
  >
    <WorkflowStatus
      workflow={workflow}
      qaResult={qaResult}
      busyAction={busyAction}
      busyProgress={busyProgress}
      onCancelBusyAction={onCancelBusyAction}
    />
    {showSavedStatus ? (
      <RunHistoryStatus
        autosaveState={autosaveState}
        revisions={runRevisions}
        historyBusy={historyBusy}
        historyError={historyError}
        onOpenHistory={onOpenHistory}
        onRetryCloudSave={onRetryCloudSave}
      />
    ) : null}
  </aside>
);
