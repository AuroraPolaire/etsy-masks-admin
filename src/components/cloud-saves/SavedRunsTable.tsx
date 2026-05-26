import { Download } from 'lucide-react';

import { formatCloudSaveDateTime } from './cloudSaveUtils';
import { formatBytes } from '../../lib/files';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';

import type { BackendRunSummary } from '../../types';

type SavedRunsTableProps = {
  runs: BackendRunSummary[];
  filteredRuns: BackendRunSummary[];
  selectedRunId: string;
  runSearchQuery: string;
  backendBusy: boolean;
  onRunSearchChange: (query: string) => void;
  onRunSelected: (runId: string) => void;
  onRestoreRun: (runId: string) => void;
};

export const SavedRunsTable = ({
  runs,
  filteredRuns,
  selectedRunId,
  runSearchQuery,
  backendBusy,
  onRunSearchChange,
  onRunSelected,
  onRestoreRun,
}: SavedRunsTableProps) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-strong">Previous drafts and finals</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Search by idea or status, check the high-level details, then restore the run you want.
          </p>
        </div>
        <div className="w-full lg:max-w-sm">
          <Input
            label="Search saved runs"
            name="backendRunSearch"
            type="search"
            value={runSearchQuery}
            placeholder="Idea, status, project id, or run id"
            helperText={`${filteredRuns.length}/${runs.length} runs shown`}
            onChange={(event) => onRunSearchChange(event.target.value)}
          />
        </div>
      </div>
    </CardHeader>
    <CardBody>
      {filteredRuns.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {runs.length === 0
            ? 'No backend drafts or finals yet.'
            : 'No backend runs match the search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface-divider text-xs uppercase text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Idea</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2 text-right font-semibold">Files</th>
                <th className="px-3 py-2 text-right font-semibold">Size</th>
                <th className="py-2 pl-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const isSelected = run.id === selectedRunId;

                return (
                  <tr
                    key={run.id}
                    className={`border-b border-surface-divider ${
                      isSelected ? 'bg-brand-subtle' : ''
                    }`}
                  >
                    <td className="max-w-80 py-3 pr-3">
                      <p className="truncate font-semibold text-ink-strong">{run.idea}</p>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {run.projectId} / {run.id}
                      </p>
                    </td>
                    <td className="p-3">
                      <Badge tone={run.status === 'final' ? 'success' : 'info'}>
                        {run.status === 'final' ? 'Final' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="p-3 text-ink-base">{formatCloudSaveDateTime(run.updatedAt)}</td>
                    <td className="p-3 text-right text-ink-base">{run.fileCount}</td>
                    <td className="p-3 text-right text-ink-base">
                      {formatBytes(run.totalSizeBytes)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={backendBusy}
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={() => onRunSelected(run.id)}
                        >
                          {isSelected ? 'Previewing' : 'Preview'}
                        </Button>
                        <Button
                          disabled={backendBusy}
                          variant="primary"
                          onClick={() => onRestoreRun(run.id)}
                        >
                          <Download aria-hidden="true" className="mr-2" size={17} />
                          Restore
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardBody>
  </Card>
);
