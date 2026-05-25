import { createManagedFileFromBackendRecord, managedFileToBackendMetadata } from './backendFiles';

import type { createBackendClient } from './backendClient';
import type {
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyActionContext,
  ManagedFile,
  Project,
} from '../types';

type BackendClient = ReturnType<typeof createBackendClient>;

export type BackendRunCacheState = {
  health: BackendHealth;
  runs: BackendRunSummary[];
  selectedRunId: string;
  snapshot: BackendProjectSnapshot | null;
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const loadBackendRunCache = async (
  client: BackendClient,
  preferredRunId: string | undefined,
  { signal, setProgress }: BusyActionContext,
): Promise<BackendRunCacheState> => {
  setProgress('Checking Cloudflare Worker health...');
  const health = await client.getHealth(signal);

  setProgress('Reading saved runs from D1...');
  const { runs } = await client.listRuns(signal);
  const selectedRunId =
    preferredRunId && runs.some((run) => run.id === preferredRunId)
      ? preferredRunId
      : (runs[0]?.id ?? '');

  if (!selectedRunId) {
    return { health, runs, selectedRunId, snapshot: null };
  }

  setProgress('Reading selected run metadata...');
  const snapshot = await client.getRun(selectedRunId, signal);

  return { health, runs, selectedRunId, snapshot };
};

export const getOversizedFiles = (files: ManagedFile[], maxFileBytes: number): ManagedFile[] =>
  files.filter((file) => file.size > maxFileBytes);

export const uploadBackendRunFiles = async (
  client: BackendClient,
  project: Project,
  runId: string,
  files: ManagedFile[],
  { signal, setProgress }: BusyActionContext,
): Promise<void> => {
  for (const [index, file] of files.entries()) {
    if (signal.aborted) {
      throw new DOMException('Backend backup cancelled', 'AbortError');
    }

    setProgress(`Uploading ${index + 1}/${files.length}: ${file.name}`);
    await client.uploadFile(runId, managedFileToBackendMetadata(project, file), file.file, signal);
  }
};

export const downloadBackendRunFiles = async (
  client: BackendClient,
  runId: string,
  snapshot: BackendProjectSnapshot,
  { signal, setProgress }: BusyActionContext,
): Promise<ManagedFile[]> => {
  const restoredFiles: ManagedFile[] = [];

  for (const [index, file] of snapshot.files.entries()) {
    if (signal.aborted) {
      throw new DOMException('Backend restore cancelled', 'AbortError');
    }

    setProgress(`Downloading ${index + 1}/${snapshot.files.length}: ${file.name}`);
    const blob = await client.downloadFile(runId, file.id, signal);
    restoredFiles.push(createManagedFileFromBackendRecord(file, blob));
  }

  return restoredFiles;
};
