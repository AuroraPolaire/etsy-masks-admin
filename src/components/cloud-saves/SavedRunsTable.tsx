import { ChevronDown, Download, Trash2 } from 'lucide-react';
import { Fragment } from 'react';

import { formatCloudSaveDateTime } from './cloudSaveUtils';
import { formatBytes } from '../../lib/files';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';

import type { BackendProjectSnapshot, BackendRunSummary } from '../../types';

type SavedRunsTableProps = {
  runs: BackendRunSummary[];
  filteredRuns: BackendRunSummary[];
  selectedRunId: string;
  snapshot: BackendProjectSnapshot | null;
  runSearchQuery: string;
  backendBusy: boolean;
  backendReachable: boolean;
  onRunSearchChange: (query: string) => void;
  onRunSelected: (runId: string) => void;
  onRestoreRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
};

const getSnapshotMetric = (
  snapshot: BackendProjectSnapshot | null,
  runId: string,
  label: 'title' | 'theme' | 'topics' | 'model' | 'output',
): string => {
  if (snapshot?.runId !== runId || !snapshot.project) {
    return 'Loading...';
  }

  if (label === 'title') {
    return snapshot.project.settings.title.trim() || 'Untitled project';
  }

  if (label === 'theme') {
    return snapshot.project.settings.theme.trim() || 'No theme';
  }

  if (label === 'topics') {
    return `${snapshot.project.subjects.length}`;
  }

  if (label === 'model') {
    return snapshot.project.openAIImageSettings.model;
  }

  const settings = snapshot.project.openAIImageSettings;
  return `${settings.quality} / ${settings.size} / ${settings.outputFormat}`;
};

export const SavedRunsTable = ({
  runs,
  filteredRuns,
  selectedRunId,
  snapshot,
  runSearchQuery,
  backendBusy,
  backendReachable,
  onRunSearchChange,
  onRunSelected,
  onRestoreRun,
  onDeleteRun,
}: SavedRunsTableProps) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink-strong">Saved runs</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Search by idea, click a row for details, then restore or delete the run you need.
          </p>
        </div>
        <div className="w-full lg:max-w-sm">
          <Input
            label="Search saved runs"
            name="backendRunSearch"
            type="search"
            value={runSearchQuery}
            placeholder="Idea, project id, or run id"
            helperText={`${filteredRuns.length}/${runs.length} runs shown`}
            onChange={(event) => onRunSearchChange(event.target.value)}
          />
        </div>
      </div>
    </CardHeader>
    <CardBody>
      {filteredRuns.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {runs.length === 0 ? 'No backend runs saved yet.' : 'No backend runs match the search.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface-divider text-xs uppercase text-ink-muted">
                <th className="py-2 pr-3 font-semibold">Idea</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2 text-right font-semibold">Files</th>
                <th className="px-3 py-2 text-right font-semibold">Size</th>
                <th className="py-2 pl-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const isSelected = run.id === selectedRunId;
                const isSnapshotReady = snapshot?.runId === run.id && Boolean(snapshot.project);
                const detailsId = `saved-run-details-${run.id}`;

                return (
                  <Fragment key={run.id}>
                    <tr
                      className={`cursor-pointer border-b border-surface-divider transition hover:bg-surface-muted focus:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                        isSelected ? 'bg-brand-subtle' : ''
                      }`}
                      onClick={() => onRunSelected(run.id)}
                    >
                      <td className="max-w-80 py-3 pr-3">
                        <button
                          type="button"
                          aria-controls={detailsId}
                          aria-expanded={isSelected}
                          className="flex w-full min-w-0 items-start gap-2 rounded-control text-left focus:outline-none focus:ring-2 focus:ring-brand/20"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRunSelected(run.id);
                          }}
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`mt-0.5 shrink-0 text-ink-muted transition ${
                              isSelected ? '' : '-rotate-90'
                            }`}
                            size={17}
                          />
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-ink-strong">
                              {run.idea}
                            </span>
                            <span className="mt-1 block truncate text-xs text-ink-muted">
                              {run.projectId} / {run.id}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className="p-3 text-ink-base">
                        {formatCloudSaveDateTime(run.updatedAt)}
                      </td>
                      <td className="p-3 text-right text-ink-base">{run.fileCount}</td>
                      <td className="p-3 text-right text-ink-base">
                        {formatBytes(run.totalSizeBytes)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={!backendReachable || backendBusy}
                            variant="primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRestoreRun(run.id);
                            }}
                          >
                            <Download aria-hidden="true" className="mr-2" size={17} />
                            Restore
                          </Button>
                          <IconButton
                            disabled={!backendReachable || backendBusy}
                            icon={Trash2}
                            label={`Delete saved run ${run.idea}`}
                            variant="danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteRun(run.id);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                    {isSelected ? (
                      <tr
                        id={detailsId}
                        className="border-b border-surface-divider bg-brand-subtle"
                      >
                        <td colSpan={5} className="p-4">
                          <dl className="grid gap-3 md:grid-cols-3">
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">Title</dt>
                              <dd className="mt-1 font-semibold text-ink-strong">
                                {getSnapshotMetric(snapshot, run.id, 'title')}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">Theme</dt>
                              <dd className="mt-1 font-semibold text-ink-strong">
                                {getSnapshotMetric(snapshot, run.id, 'theme')}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">Topics</dt>
                              <dd className="mt-1 font-semibold text-ink-strong">
                                {getSnapshotMetric(snapshot, run.id, 'topics')}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">AI model</dt>
                              <dd className="mt-1 font-semibold text-ink-strong">
                                {getSnapshotMetric(snapshot, run.id, 'model')}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">AI output</dt>
                              <dd className="mt-1 font-semibold text-ink-strong">
                                {getSnapshotMetric(snapshot, run.id, 'output')}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs uppercase text-ink-muted">Save state</dt>
                              <dd className="mt-1">
                                <Badge tone={isSnapshotReady ? 'success' : 'neutral'}>
                                  {isSnapshotReady ? 'Loaded' : 'Loading'}
                                </Badge>
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardBody>
  </Card>
);
