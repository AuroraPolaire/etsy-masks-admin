import { Trash2 } from 'lucide-react';

import { Button } from '../ui/Button';

import type { BackendRunSummary } from '../../types';

type CloudDangerZoneProps = {
  runs: BackendRunSummary[];
  backendBusy: boolean;
  backendReachable: boolean;
  onDeleteAllCloudData: () => void;
  onClearSessionFiles: () => void;
};

export const CloudDangerZone = ({
  runs,
  backendBusy,
  backendReachable,
  onDeleteAllCloudData,
  onClearSessionFiles,
}: CloudDangerZoneProps) => (
  <details className="rounded-control border border-feedback-danger-border bg-feedback-danger-bg">
    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-feedback-danger-fg">
      Danger zone
    </summary>
    <div className="space-y-4 border-t border-feedback-danger-border p-4">
      <p className="text-sm text-feedback-danger-fg">
        Individual projects can be deleted from the saved projects list. Delete all saved work
        removes every saved project, event, and stored file. Clearing current tab files first saves
        the current project, then starts a fresh browser draft without those in-tab file objects.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" onClick={onClearSessionFiles}>
          <Trash2 aria-hidden="true" className="mr-2" size={17} />
          Clear current tab files
        </Button>
        <Button
          variant="danger"
          disabled={!backendReachable || backendBusy || runs.length === 0}
          onClick={onDeleteAllCloudData}
        >
          <Trash2 aria-hidden="true" className="mr-2" size={17} />
          Delete all saved work
        </Button>
      </div>
    </div>
  </details>
);
