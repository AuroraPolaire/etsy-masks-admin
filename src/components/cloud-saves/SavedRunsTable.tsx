import { ChevronDown, Download, Trash2 } from 'lucide-react';

import { formatCloudSaveDateTime } from './cloudSaveUtils';
import { formatBytes } from '../../lib/files';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Surface } from '../ui/Surface';

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
          <h2 className="text-base font-bold text-ink-strong">Saved projects</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Search by idea, open a project to check details, then load it only when you want to
            replace the current work.
          </p>
        </div>
        <div className="w-full lg:max-w-sm">
          <Input
            label="Search saved projects"
            name="backendRunSearch"
            type="search"
            value={runSearchQuery}
            placeholder="Idea or saved project name"
            helperText={`${filteredRuns.length}/${runs.length} projects shown`}
            onChange={(event) => onRunSearchChange(event.target.value)}
          />
        </div>
      </div>
    </CardHeader>
    <CardBody>
      {filteredRuns.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {runs.length === 0 ? 'No saved projects yet.' : 'No saved projects match the search.'}
        </p>
      ) : (
        <div className="grid gap-3">
          {filteredRuns.map((run) => {
            const isSelected = run.id === selectedRunId;
            const isSnapshotReady = snapshot?.runId === run.id && Boolean(snapshot.project);
            const detailsId = `saved-run-details-${run.id}`;
            const toggleDetails = () => onRunSelected(isSelected ? '' : run.id);

            return (
              <Surface
                as="article"
                key={run.id}
                variant={isSelected ? 'muted' : 'default'}
                className="p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <button
                    type="button"
                    aria-controls={detailsId}
                    aria-expanded={isSelected}
                    className="flex min-w-0 items-start gap-3 rounded-control text-left focus:outline-none focus:ring-2 focus:ring-brand/20"
                    onClick={toggleDetails}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`mt-0.5 shrink-0 text-ink-muted transition ${
                        isSelected ? '' : '-rotate-90'
                      }`}
                      size={18}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-ink-strong">{run.idea}</h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        Last edited {formatCloudSaveDateTime(run.updatedAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="neutral">{run.fileCount} files</Badge>
                        <Badge tone="neutral">{formatBytes(run.totalSizeBytes)}</Badge>
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      disabled={!backendReachable || backendBusy}
                      variant="primary"
                      onClick={() => onRestoreRun(run.id)}
                    >
                      <Download aria-hidden="true" className="mr-2" size={17} />
                      Load project
                    </Button>
                    <IconButton
                      disabled={!backendReachable || backendBusy}
                      icon={Trash2}
                      label={`Delete saved project ${run.idea}`}
                      variant="danger"
                      onClick={() => onDeleteRun(run.id)}
                    />
                  </div>
                </div>
                {isSelected ? (
                  <div id={detailsId} className="mt-4 border-t border-surface-outline pt-4">
                    <dl className="grid gap-3 md:grid-cols-4">
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
                        <dt className="text-xs uppercase text-ink-muted">Save state</dt>
                        <dd className="mt-1">
                          <Badge tone={isSnapshotReady ? 'success' : 'neutral'}>
                            {isSnapshotReady ? 'Loaded' : 'Loading'}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-ink-strong">
                        Technical details
                      </summary>
                      <dl className="mt-2 grid gap-3 md:grid-cols-2">
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
                          <dt className="text-xs uppercase text-ink-muted">Project id</dt>
                          <dd className="mt-1 break-all font-mono text-xs text-ink-base">
                            {run.projectId}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-ink-muted">Run id</dt>
                          <dd className="mt-1 break-all font-mono text-xs text-ink-base">
                            {run.id}
                          </dd>
                        </div>
                      </dl>
                    </details>
                  </div>
                ) : null}
              </Surface>
            );
          })}
        </div>
      )}
    </CardBody>
  </Card>
);
