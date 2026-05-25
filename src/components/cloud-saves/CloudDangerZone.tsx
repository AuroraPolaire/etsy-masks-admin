import { Trash2 } from 'lucide-react';

import { Button } from '../ui/Button';

import type { BackendRunSummary } from '../../types';

type CloudDangerZoneProps = {
  runs: BackendRunSummary[];
  selectedRun: BackendRunSummary | undefined;
  backendBusy: boolean;
  backendReachable: boolean;
  onDeleteSelectedRun: () => void;
  onDeleteAllCloudData: () => void;
};

export const CloudDangerZone = ({
  runs,
  selectedRun,
  backendBusy,
  backendReachable,
  onDeleteSelectedRun,
  onDeleteAllCloudData,
}: CloudDangerZoneProps) => (
  <details className="rounded-control border border-feedback-danger-border bg-feedback-danger-bg">
    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-feedback-danger-fg">
      Danger zone
    </summary>
    <div className="space-y-4 border-t border-feedback-danger-border p-4">
      <p className="text-sm text-feedback-danger-fg">
        Delete selected run removes one saved idea and its files. Delete all cloud data removes
        every saved run, backend event, and R2 object.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="danger"
          disabled={!backendReachable || backendBusy || !selectedRun}
          onClick={onDeleteSelectedRun}
        >
          <Trash2 aria-hidden="true" className="mr-2" size={17} />
          Delete previewed run
        </Button>
        <Button
          variant="danger"
          disabled={!backendReachable || backendBusy || runs.length === 0}
          onClick={onDeleteAllCloudData}
        >
          <Trash2 aria-hidden="true" className="mr-2" size={17} />
          Delete all cloud data
        </Button>
      </div>
    </div>
  </details>
);
