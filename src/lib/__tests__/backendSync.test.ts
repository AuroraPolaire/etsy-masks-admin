import { describe, expect, it } from 'vitest';

import { getFileDownloadPath } from '../backendClient';
import { downloadBackendRunFiles, findReusableBackendDraftRun } from '../backendSync';

import type { BackendFileRecord, BackendProjectSnapshot, BackendRunSummary } from '../../types';
import type { createBackendClient } from '../backendClient';

const createRun = (overrides: Partial<BackendRunSummary>): BackendRunSummary => ({
  id: 'run-1',
  projectId: 'project-1',
  idea: 'Project masks',
  status: 'draft',
  createdAt: '2026-05-26T09:00:00.000Z',
  updatedAt: '2026-05-26T09:00:00.000Z',
  fileCount: 0,
  totalSizeBytes: 0,
  ...overrides,
});

const createBackendFile = (index: number, overrides: Partial<BackendFileRecord> = {}) =>
  ({
    id: `file-${index}`,
    runId: 'run-1',
    projectId: 'project-1',
    name: `file-${index}.bin`,
    originalName: `file-${index}.bin`,
    size: 10,
    type: 'application/octet-stream',
    kind: 'uploaded',
    addedAt: `2026-05-26T09:00:0${index}.000Z`,
    reviewState: 'approved',
    reviewNotes: '',
    assetVariant: 'color',
    explicitlyConfirmed: true,
    updatedAt: `2026-05-26T09:10:0${index}.000Z`,
    ...overrides,
  }) satisfies BackendFileRecord;

const createSnapshot = (files: BackendFileRecord[]): BackendProjectSnapshot => ({
  runId: 'run-1',
  idea: 'Project masks',
  status: 'draft',
  project: null,
  updatedAt: '2026-05-26T09:00:00.000Z',
  files,
  events: [],
});

const createClient = (
  downloadFile: ReturnType<typeof createBackendClient>['downloadFile'],
): ReturnType<typeof createBackendClient> =>
  ({
    downloadFile,
  }) as ReturnType<typeof createBackendClient>;

describe('backend draft sync helpers', () => {
  it('reuses the latest saved run for the same project id', () => {
    const reusableRun = findReusableBackendDraftRun(
      [
        createRun({
          id: 'older-run',
          updatedAt: '2026-05-26T09:00:00.000Z',
        }),
        createRun({
          id: 'different-project-run',
          projectId: 'project-2',
          updatedAt: '2026-05-26T10:30:00.000Z',
        }),
        createRun({
          id: 'latest-run',
          updatedAt: '2026-05-26T11:00:00.000Z',
        }),
      ],
      'project-1',
    );

    expect(reusableRun?.id).toBe('latest-run');
  });

  it('does not reuse a run from another project', () => {
    expect(
      findReusableBackendDraftRun([createRun({ projectId: 'project-2' })], 'project-1'),
    ).toBeUndefined();
  });

  it('downloads restored files with bounded concurrency', async () => {
    let activeDownloads = 0;
    let maxActiveDownloads = 0;
    const files = Array.from({ length: 6 }, (_, index) => createBackendFile(index + 1));
    const client = createClient(async () => {
      activeDownloads += 1;
      maxActiveDownloads = Math.max(maxActiveDownloads, activeDownloads);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeDownloads -= 1;

      return new Blob(['file'], { type: 'application/octet-stream' });
    });

    const result = await downloadBackendRunFiles(client, 'run-1', createSnapshot(files), {
      signal: new AbortController().signal,
      concurrency: 2,
      setProgress: () => undefined,
    });

    expect(maxActiveDownloads).toBe(2);
    expect(result.files).toHaveLength(6);
    expect(result.cancelled).toBe(false);
    expect(result.failedFiles).toEqual([]);
  });

  it('emits restored files as downloads finish while returning metadata-ordered results', async () => {
    const files = [createBackendFile(1), createBackendFile(2), createBackendFile(3)];
    const emittedNames: string[] = [];
    const client = createClient(async (_runId, file) => {
      const delayMs = file.id === 'file-1' ? 20 : file.id === 'file-2' ? 1 : 5;
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      return new Blob([file.id], { type: 'application/octet-stream' });
    });

    const result = await downloadBackendRunFiles(client, 'run-1', createSnapshot(files), {
      signal: new AbortController().signal,
      concurrency: 3,
      setProgress: () => undefined,
      onFileRestored: (file) => emittedNames.push(file.name),
    });

    expect(emittedNames).toEqual(['file-2.bin', 'file-3.bin', 'file-1.bin']);
    expect(result.files.map((file) => file.name)).toEqual([
      'file-1.bin',
      'file-2.bin',
      'file-3.bin',
    ]);
  });

  it('keeps successful downloads and reports failed files', async () => {
    const failedFile = createBackendFile(2);
    const files = [createBackendFile(1), failedFile, createBackendFile(3)];
    const client = createClient((_runId, file) => {
      if (file.id === failedFile.id) {
        return Promise.reject(new Error('R2 read failed'));
      }

      return Promise.resolve(new Blob([file.id], { type: 'application/octet-stream' }));
    });

    const result = await downloadBackendRunFiles(client, 'run-1', createSnapshot(files), {
      signal: new AbortController().signal,
      concurrency: 3,
      setProgress: () => undefined,
    });

    expect(result.files.map((file) => file.id)).toEqual(['file-1', 'file-3']);
    expect(result.failedFiles).toEqual([{ file: failedFile, message: 'R2 read failed' }]);
    expect(result.cancelled).toBe(false);
  });

  it('reports cancelled restores without treating them as file failures', async () => {
    const controller = new AbortController();
    const files = [createBackendFile(1), createBackendFile(2)];
    const client = createClient(() => {
      controller.abort();
      return Promise.reject(new DOMException('Restore cancelled', 'AbortError'));
    });

    const result = await downloadBackendRunFiles(client, 'run-1', createSnapshot(files), {
      signal: controller.signal,
      concurrency: 2,
      setProgress: () => undefined,
    });

    expect(result.cancelled).toBe(true);
    expect(result.failedFiles).toEqual([]);
  });

  it('builds versioned backend file download URLs', () => {
    expect(
      getFileDownloadPath('run 1', {
        id: 'file/1',
        updatedAt: '2026-05-26T09:10:00.000Z',
      }),
    ).toBe('/api/runs/run%201/files/file%2F1?v=2026-05-26T09%3A10%3A00.000Z');
  });
});
