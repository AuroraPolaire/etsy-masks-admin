import { Clock3, Pin, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatCloudSaveDateTime } from './cloud-saves/cloudSaveUtils';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { formatBytes } from '../lib/files';
import { groupRunRevisionsByStage } from '../lib/runHistory';

import type { RunRevisionSummary } from '../types';

type RunHistoryDrawerProps = {
  open: boolean;
  revisions: RunRevisionSummary[];
  historyBusy: boolean;
  onClose: () => void;
  onRestoreRevision: (revisionId: string) => void;
};

const kindLabels: Record<RunRevisionSummary['kind'], string> = {
  autosave: 'Auto saved',
  manual: 'Saved by you',
  generation: 'After generation',
  'restore-safety': 'Before load',
  restore: 'Loaded version',
  export: 'Export',
};

const kindDescriptions: Record<RunRevisionSummary['kind'], string> = {
  autosave: 'Saved automatically after edits.',
  manual: 'Saved by you before a risky change.',
  generation: 'Saved after files or assets were generated.',
  'restore-safety': 'Saved automatically before loading an older version.',
  restore: 'Saved after an older version was loaded.',
  export: 'Saved around export work.',
};

const getKindTone = (kind: RunRevisionSummary['kind']) => {
  if (kind === 'manual' || kind === 'restore-safety') {
    return 'success' as const;
  }

  if (kind === 'restore') {
    return 'info' as const;
  }

  return 'neutral' as const;
};

export const RunHistoryDrawer = ({
  open,
  revisions,
  historyBusy,
  onClose,
  onRestoreRevision,
}: RunHistoryDrawerProps) => {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRevisions = useMemo(() => {
    if (!open) {
      return [];
    }

    return revisions.filter((revision) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${revision.label} ${revision.description ?? ''} ${revision.stage} ${revision.kind}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [normalizedQuery, open, revisions]);
  const groups = useMemo(() => groupRunRevisionsByStage(filteredRevisions), [filteredRevisions]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink-strong/35">
      <aside
        aria-label="Previous versions"
        className="flex size-full max-w-3xl flex-col border-l border-surface-outline bg-surface-panel shadow-panel"
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-divider p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Saved work</p>
            <h2 className="mt-1 text-xl font-bold text-ink-strong">Previous versions</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Choose an older version to load. Your current work is saved first, so you can come
              back to it.
            </p>
          </div>
          <IconButton icon={X} label="Close history" variant="ghost" onClick={onClose} />
        </div>

        <div className="border-b border-surface-divider p-5">
          <Input
            label="Search previous versions"
            name="runHistorySearch"
            type="search"
            value={query}
            placeholder="Name, stage, or save type"
            helperText={`${filteredRevisions.length}/${revisions.length} versions shown`}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {groups.length === 0 ? (
            <div className="rounded-control border border-surface-divider bg-surface-muted p-4 text-sm text-ink-muted">
              {revisions.length === 0
                ? 'No previous versions yet. Autosave creates them after this project is saved online.'
                : 'No previous versions match the search.'}
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.stage} aria-labelledby={`history-group-${group.stage}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3
                      id={`history-group-${group.stage}`}
                      className="text-sm font-bold uppercase text-ink-muted"
                    >
                      {group.label}
                    </h3>
                    <Badge>{group.revisions.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {group.revisions.map((revision) => (
                      <article
                        key={revision.id}
                        className="rounded-panel border border-surface-divider bg-surface-raised p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={getKindTone(revision.kind)}>
                                {kindLabels[revision.kind]}
                              </Badge>
                              {revision.isPinned ? (
                                <Badge tone="success">
                                  <Pin aria-hidden="true" className="mr-1" size={12} />
                                  Pinned
                                </Badge>
                              ) : null}
                              <span className="inline-flex items-center text-xs text-ink-muted">
                                <Clock3 aria-hidden="true" className="mr-1" size={13} />
                                {formatCloudSaveDateTime(revision.createdAt)}
                              </span>
                            </div>
                            <h4 className="mt-2 text-base font-bold text-ink-strong">
                              {revision.label}
                            </h4>
                            <p className="mt-1 text-sm text-ink-muted">
                              {revision.description ?? kindDescriptions[revision.kind]}
                            </p>
                            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                              <div className="rounded-control bg-surface-muted px-3 py-2">
                                <dt className="text-xs uppercase text-ink-muted">Version</dt>
                                <dd className="font-semibold text-ink-strong">
                                  #{revision.sequenceNumber}
                                </dd>
                              </div>
                              <div className="rounded-control bg-surface-muted px-3 py-2">
                                <dt className="text-xs uppercase text-ink-muted">Files</dt>
                                <dd className="font-semibold text-ink-strong">
                                  {revision.fileCount}
                                </dd>
                              </div>
                              <div className="rounded-control bg-surface-muted px-3 py-2">
                                <dt className="text-xs uppercase text-ink-muted">Size</dt>
                                <dd className="font-semibold text-ink-strong">
                                  {formatBytes(revision.totalSizeBytes)}
                                </dd>
                              </div>
                            </dl>
                          </div>
                          <Button
                            disabled={historyBusy}
                            variant="primary"
                            className="shrink-0"
                            onClick={() => onRestoreRevision(revision.id)}
                          >
                            <RotateCcw aria-hidden="true" className="mr-2" size={17} />
                            Load version
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-surface-divider p-4 text-xs text-ink-muted">
          <Search aria-hidden="true" className="mr-1 inline" size={13} />
          Loading a version saves your current work first, so the current version remains reachable.
        </div>
      </aside>
    </div>
  );
};
