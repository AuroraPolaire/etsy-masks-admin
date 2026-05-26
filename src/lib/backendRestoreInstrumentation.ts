import type { BackendRestoreResult } from '../types';

export const getBackendRestoreNowMs = (): number =>
  typeof performance === 'object' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const logBackendRestoreInstrumentation = ({
  label,
  metadataFetchMs,
  firstFileAppendedMs,
  totalRestoreMs,
  result,
}: {
  label: string;
  metadataFetchMs: number;
  firstFileAppendedMs: number | null;
  totalRestoreMs: number;
  result: BackendRestoreResult;
}): void => {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return;
  }

  console.info('[backend restore orchestration]', {
    label,
    metadataFetchMs: Math.round(metadataFetchMs),
    firstFileAppendedMs: firstFileAppendedMs === null ? null : Math.round(firstFileAppendedMs),
    totalRestoreMs: Math.round(totalRestoreMs),
    restoredFiles: result.files.length,
    failedFiles: result.failedFiles.length,
    cancelled: result.cancelled,
  });
};
