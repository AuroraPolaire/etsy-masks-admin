import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';

import type { BusyAction, QAResult } from '../types';
import type { WorkflowState } from '../workflow/workflowState';

type WorkflowStatusProps = {
  workflow: WorkflowState;
  qaResult: QAResult;
  busyAction: BusyAction;
  busyProgress: string | null;
  onCancelBusyAction: () => void;
};

const busyActionLabels: Record<Exclude<BusyAction, null>, string> = {
  uploading: 'Uploading files',
  'brief-generation': 'Drafting brief',
  'image-generation': 'Generating images',
  archive: 'Creating archive',
  'backend-sync': 'Syncing backend',
  'project-json': 'Exporting project JSON',
  import: 'Importing project JSON',
};

export const WorkflowStatus = ({
  workflow,
  qaResult,
  busyAction,
  busyProgress,
  onCancelBusyAction,
}: WorkflowStatusProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-strong">Next action</h2>
          <Badge tone={qaResult.status === 'etsy-ready' ? 'success' : 'warning'}>
            {qaResult.readinessPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <Alert tone="brand" className="font-semibold">
          {workflow.nextAction}
        </Alert>
        {busyAction ? (
          <Alert tone="info">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{busyActionLabels[busyAction]}</p>
                {busyProgress ? <p className="mt-1 text-xs">{busyProgress}</p> : null}
              </div>
              <Button
                className="self-start sm:self-center"
                variant="ghost"
                onClick={onCancelBusyAction}
              >
                Cancel
              </Button>
            </div>
          </Alert>
        ) : null}
        <dl className="grid grid-cols-2 gap-2 text-center text-sm">
          <StatCard
            label="Color"
            value={`${workflow.approvedImageCount}/${workflow.subjectCount}`}
          />
          <StatCard
            label="Coloring"
            value={`${workflow.approvedColoringPageCount}/${workflow.subjectCount}`}
          />
          <StatCard label="Readiness" value={`${qaResult.readinessPercentage}%`} />
          <StatCard
            label="Final ZIP"
            value={qaResult.status === 'etsy-ready' ? 'Ready' : 'Review'}
          />
        </dl>
      </CardBody>
    </Card>
  );
};
