import type { BackendProjectSnapshot, BackendRunSummary } from '../../types';

export const formatCloudSaveDateTime = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const getSnapshotTitle = (snapshot: BackendProjectSnapshot | null): string => {
  if (snapshot?.idea?.trim()) {
    return snapshot.idea;
  }

  const title = snapshot?.project?.settings.title.trim();
  if (title) {
    return title;
  }

  return snapshot?.project ? 'Untitled project' : 'No selected run';
};

export const filterRuns = (runs: BackendRunSummary[], query: string): BackendRunSummary[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return runs;
  }

  return runs.filter((run) =>
    [run.idea, run.projectId, run.id].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
};
