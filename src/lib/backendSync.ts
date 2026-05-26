import { createManagedFileFromBackendRecord, managedFileToBackendMetadata } from './backendFiles';

import type { createBackendClient } from './backendClient';
import type {
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyActionContext,
  BackendFileRecord,
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

const metadataSignature = (value: unknown): string => JSON.stringify(value);

const managedFileSignature = (project: Project, file: ManagedFile): string =>
  metadataSignature(managedFileToBackendMetadata(project, file));

const backendFileSignature = (file: BackendFileRecord): string =>
  metadataSignature({
    id: file.id,
    projectId: file.projectId,
    name: file.name,
    originalName: file.originalName,
    size: file.size,
    type: file.type,
    kind: file.kind,
    addedAt: file.addedAt,
    reviewState: file.reviewState,
    reviewNotes: file.reviewNotes,
    ...(file.mappedSubjectId ? { mappedSubjectId: file.mappedSubjectId } : {}),
    explicitlyConfirmed: file.explicitlyConfirmed,
    ...(file.imageMetadata ? { imageMetadata: file.imageMetadata } : {}),
  });

export const createBackendAutosaveKey = (
  project: Project,
  files: ManagedFile[],
  idea: string,
): string =>
  JSON.stringify({
    idea,
    project,
    files: files.map((file) => ({
      metadata: managedFileToBackendMetadata(project, file),
      file: {
        name: file.file.name,
        size: file.file.size,
        type: file.file.type,
        lastModified: file.file.lastModified,
      },
    })),
  });

export const shouldAutosaveBackendDraft = (project: Project, files: ManagedFile[]): boolean =>
  files.length > 0 ||
  project.subjects.length > 0 ||
  Object.values(project.settings).some((value) =>
    typeof value === 'string' ? value.trim().length > 0 : false,
  ) ||
  Boolean(project.lastBriefUpdatedAt);

export const syncBackendRunFiles = async (
  client: BackendClient,
  project: Project,
  runId: string,
  files: ManagedFile[],
  {
    signal,
    setProgress,
    forceUpload = false,
  }: {
    signal?: AbortSignal;
    setProgress?: (message: string | null) => void;
    forceUpload?: boolean;
  } = {},
): Promise<BackendProjectSnapshot> => {
  const snapshot = await client.getRun(runId, signal);
  const localFileIds = new Set(files.map((file) => file.id));
  const remoteFilesById = new Map(snapshot.files.map((file) => [file.id, file]));

  for (const remoteFile of snapshot.files) {
    if (signal?.aborted) {
      throw new DOMException('Backend file sync cancelled', 'AbortError');
    }

    if (!localFileIds.has(remoteFile.id)) {
      setProgress?.(`Removing cloud file ${remoteFile.name}...`);
      await client.deleteFile(runId, remoteFile.id, signal);
    }
  }

  for (const [index, file] of files.entries()) {
    if (signal?.aborted) {
      throw new DOMException('Backend file sync cancelled', 'AbortError');
    }

    const remoteFile = remoteFilesById.get(file.id);
    const needsUpload =
      forceUpload ||
      !remoteFile ||
      managedFileSignature(project, file) !== backendFileSignature(remoteFile);

    if (needsUpload) {
      setProgress?.(`Uploading ${index + 1}/${files.length}: ${file.name}`);
      await client.uploadFile(
        runId,
        managedFileToBackendMetadata(project, file),
        file.file,
        signal,
      );
    }
  }

  return client.getRun(runId, signal);
};

export const uploadBackendRunFiles = async (
  client: BackendClient,
  project: Project,
  runId: string,
  files: ManagedFile[],
  { signal, setProgress }: BusyActionContext,
): Promise<void> => {
  await syncBackendRunFiles(client, project, runId, files, {
    signal,
    setProgress,
    forceUpload: true,
  });
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
