import { createManagedFileFromBackendRecord, managedFileToBackendMetadata } from './backendFiles';

import type { createBackendClient } from './backendClient';
import type {
  BackendHealth,
  BackendProjectSnapshot,
  BackendRestoreProgress,
  BackendRestoreResult,
  BackendRunSummary,
  BusyActionContext,
  BackendFileRecord,
  ManagedFile,
  Project,
} from '../types';

type BackendClient = ReturnType<typeof createBackendClient>;

const DEFAULT_RESTORE_CONCURRENCY = 4;

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
  setProgress('Checking online save status...');
  const health = await client.getHealth(signal);

  setProgress('Reading saved projects...');
  const { runs } = await client.listRuns(signal);
  const selectedRunId =
    preferredRunId && runs.some((run) => run.id === preferredRunId)
      ? preferredRunId
      : (runs[0]?.id ?? '');

  if (!selectedRunId) {
    return { health, runs, selectedRunId, snapshot: null };
  }

  setProgress('Reading selected project details...');
  const snapshot = await client.getRun(selectedRunId, signal);

  return { health, runs, selectedRunId, snapshot };
};

export const getOversizedFiles = (files: ManagedFile[], maxFileBytes: number): ManagedFile[] =>
  files.filter((file) => file.size > maxFileBytes);

const getRunUpdatedAtTime = (run: BackendRunSummary): number => {
  const timestamp = Date.parse(run.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const findReusableBackendDraftRun = (
  runs: BackendRunSummary[],
  projectId: string,
): BackendRunSummary | undefined =>
  runs
    .filter((run) => run.projectId === projectId)
    .sort((left, right) => getRunUpdatedAtTime(right) - getRunUpdatedAtTime(left))[0];

export const findUsableBackendDraftRun = (
  runs: BackendRunSummary[],
  activeRunId: string,
  projectId: string,
): BackendRunSummary | undefined => {
  const activeRun = activeRunId ? runs.find((run) => run.id === activeRunId) : undefined;
  if (activeRun?.projectId === projectId) {
    return activeRun;
  }

  return findReusableBackendDraftRun(runs, projectId);
};

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
    assetVariant: file.assetVariant ?? 'color',
    ...(file.sourceFileId ? { sourceFileId: file.sourceFileId } : {}),
    ...(file.marketingAsset ? { marketingAsset: file.marketingAsset } : {}),
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
    deleteMissingRemoteFiles = true,
  }: {
    signal?: AbortSignal;
    setProgress?: (message: string | null) => void;
    forceUpload?: boolean;
    deleteMissingRemoteFiles?: boolean;
  } = {},
): Promise<BackendProjectSnapshot> => {
  const snapshot = await client.getRun(runId, signal);
  const localFileIds = new Set(files.map((file) => file.id));
  const remoteFilesById = new Map(snapshot.files.map((file) => [file.id, file]));

  if (deleteMissingRemoteFiles) {
    for (const remoteFile of snapshot.files) {
      if (signal?.aborted) {
        throw new DOMException('Backend file sync cancelled', 'AbortError');
      }

      if (!localFileIds.has(remoteFile.id)) {
        setProgress?.(`Removing saved file ${remoteFile.name}...`);
        await client.deleteFile(runId, remoteFile.id, signal);
      }
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

const formatBackendBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getNowMs = (): number =>
  typeof performance === 'object' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const errorMessageFromUnknown = (error: unknown): string =>
  error instanceof Error ? error.message : 'Could not download file.';

const clampRestoreConcurrency = (value: number | undefined, totalFiles: number): number => {
  const requestedConcurrency =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(1, Math.floor(value))
      : DEFAULT_RESTORE_CONCURRENCY;

  return Math.max(1, Math.min(requestedConcurrency, Math.max(totalFiles, 1)));
};

const logRestoreSummary = (result: BackendRestoreResult, totalDurationMs: number): void => {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return;
  }

  const downloadedBytes = result.files.reduce((total, file) => total + file.size, 0);
  console.info('[backend restore]', {
    files: result.files.length,
    failedFiles: result.failedFiles.length,
    cancelled: result.cancelled,
    downloadedBytes,
    totalDurationMs: Math.round(totalDurationMs),
    slowestFiles: [...result.timings]
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 5)
      .map((timing) => ({
        name: timing.name,
        bytes: timing.bytes,
        durationMs: Math.round(timing.durationMs),
        blobConstructionMs: Math.round(timing.blobConstructionMs),
      })),
  });
};

type DownloadBackendRunFilesOptions = {
  signal: AbortSignal;
  setProgress?: (message: string | null) => void;
  concurrency?: number;
  onProgress?: (progress: BackendRestoreProgress) => void;
  onFileRestored?: (file: ManagedFile, index: number) => void;
  onFileFailed?: (record: BackendFileRecord, error: Error) => void;
};

export const downloadBackendRunFiles = async (
  client: BackendClient,
  runId: string,
  snapshot: BackendProjectSnapshot,
  {
    signal,
    setProgress,
    concurrency: concurrencyOption,
    onProgress,
    onFileRestored,
    onFileFailed,
  }: DownloadBackendRunFilesOptions,
): Promise<BackendRestoreResult> => {
  const startedAt = getNowMs();
  const restoredFilesByIndex: Array<ManagedFile | undefined> = Array.from({
    length: snapshot.files.length,
  });
  const failedFiles: BackendRestoreResult['failedFiles'] = [];
  const timings: BackendRestoreResult['timings'] = [];
  const totalFiles = snapshot.files.length;
  const totalBytes = snapshot.files.reduce((total, file) => total + file.size, 0);
  const concurrency = clampRestoreConcurrency(concurrencyOption, totalFiles);
  let nextIndex = 0;
  let completedFiles = 0;
  let failedFileCount = 0;
  let downloadedBytes = 0;
  let cancelled = false;

  const emitProgress = (phase: BackendRestoreProgress['phase'], currentFileName = '') => {
    const progress: BackendRestoreProgress = {
      totalFiles,
      completedFiles,
      failedFiles: failedFileCount,
      downloadedBytes,
      totalBytes,
      currentFileName,
      phase,
    };

    onProgress?.(progress);

    if (phase === 'files') {
      setProgress?.(
        `Downloading ${completedFiles}/${totalFiles}, ${formatBackendBytes(
          downloadedBytes,
        )} of ${formatBackendBytes(totalBytes)}${currentFileName ? `: ${currentFileName}` : ''}`,
      );
      return;
    }

    if (phase === 'complete') {
      setProgress?.(
        `Downloaded ${completedFiles}/${totalFiles}, ${formatBackendBytes(downloadedBytes)}.`,
      );
      return;
    }

    if (phase === 'failed') {
      setProgress?.(
        `Downloaded ${completedFiles}/${totalFiles}, ${failedFileCount} failed, ${formatBackendBytes(
          downloadedBytes,
        )} restored.`,
      );
    }
  };

  emitProgress(totalFiles === 0 ? 'complete' : 'files');

  const downloadFile = async (file: BackendFileRecord, index: number) => {
    if (signal.aborted) {
      cancelled = true;
      return;
    }

    const fileStartedAt = getNowMs();
    try {
      emitProgress('files', file.name);
      const blob = await client.downloadFile(runId, file, signal);
      const blobDownloadedAt = getNowMs();
      const restoredFile = createManagedFileFromBackendRecord(file, blob);
      const fileFinishedAt = getNowMs();

      restoredFilesByIndex[index] = restoredFile;
      downloadedBytes += restoredFile.size;
      completedFiles += 1;
      timings.push({
        fileId: file.id,
        name: file.name,
        bytes: restoredFile.size,
        durationMs: fileFinishedAt - fileStartedAt,
        blobConstructionMs: fileFinishedAt - blobDownloadedAt,
      });
      onFileRestored?.(restoredFile, index);
      emitProgress('files', file.name);
    } catch (error) {
      if (isAbortError(error)) {
        cancelled = true;
      } else {
        const nextError =
          error instanceof Error ? error : new Error(errorMessageFromUnknown(error));
        failedFileCount += 1;
        failedFiles.push({
          file,
          message: nextError.message,
        });
        onFileFailed?.(file, nextError);
      }

      emitProgress('files', file.name);
    }
  };

  const worker = async () => {
    while (nextIndex < totalFiles && !signal.aborted) {
      const fileIndex = nextIndex;
      nextIndex += 1;
      const file = snapshot.files[fileIndex];
      if (file) {
        await downloadFile(file, fileIndex);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  if (signal.aborted) {
    cancelled = true;
  }

  const result: BackendRestoreResult = {
    files: restoredFilesByIndex.filter((file): file is ManagedFile => Boolean(file)),
    failedFiles,
    timings,
    cancelled,
  };
  emitProgress(cancelled || failedFiles.length > 0 ? 'failed' : 'complete');
  logRestoreSummary(result, getNowMs() - startedAt);

  return result;
};
