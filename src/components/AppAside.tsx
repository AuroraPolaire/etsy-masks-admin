import { ActivityLog } from './ActivityLog';
import { WorkflowStatus } from './WorkflowStatus';

import type { ActivityItem, BusyAction, QAResult } from '../types';
import type { WorkflowState } from '../workflow/workflowState';

type AppAsideProps = {
  workflow: WorkflowState;
  qaResult: QAResult;
  busyAction: BusyAction;
  busyProgress: string | null;
  activityLog: ActivityItem[];
  onCancelBusyAction: () => void;
};

export const AppAside = ({
  workflow,
  qaResult,
  busyAction,
  busyProgress,
  activityLog,
  onCancelBusyAction,
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
    <ActivityLog items={activityLog} />
  </aside>
);
