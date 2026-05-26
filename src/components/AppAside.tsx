import { ActivityLog } from './ActivityLog';
import { QAPanel } from './QAPanel';
import { Button } from './ui/Button';
import { WorkflowStatus } from './WorkflowStatus';

import type { ActivityItem, BusyAction, QAResult } from '../types';
import type { WorkflowState } from '../workflow/workflowState';

type AppAsideProps = {
  workflow: WorkflowState;
  qaResult: QAResult;
  busyAction: BusyAction;
  busyProgress: string | null;
  activityLog: ActivityItem[];
  showQA?: boolean;
  onCancelBusyAction: () => void;
  onClearFiles: () => void;
};

export const AppAside = ({
  workflow,
  qaResult,
  busyAction,
  busyProgress,
  activityLog,
  showQA = false,
  onCancelBusyAction,
  onClearFiles,
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
    {showQA ? <QAPanel result={qaResult} /> : null}
    <ActivityLog items={activityLog} />
    <Button className="w-full" variant="ghost" onClick={onClearFiles}>
      Clear session files
    </Button>
  </aside>
);
