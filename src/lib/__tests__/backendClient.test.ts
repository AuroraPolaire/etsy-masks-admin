import { describe, expect, it } from 'vitest';

import { createDeterministicUploadId, isRetryableBackendStatus } from '../backendClient';

import type { BackendManagedFileMetadata } from '../backendFiles';

const metadata: BackendManagedFileMetadata = {
  id: 'file-1',
  projectId: 'project-1',
  name: 'mask.png',
  originalName: 'mask.png',
  size: 4,
  type: 'image/png',
  kind: 'uploaded',
  addedAt: '2026-05-27T10:00:00.000Z',
  reviewState: 'approved',
  reviewNotes: '',
  assetVariant: 'color',
  explicitlyConfirmed: true,
};

describe('backend client retry helpers', () => {
  it('classifies transient backend and Cloudflare gateway statuses as retryable', () => {
    expect(isRetryableBackendStatus(408)).toBe(true);
    expect(isRetryableBackendStatus(429)).toBe(true);
    expect(isRetryableBackendStatus(503)).toBe(true);
    expect(isRetryableBackendStatus(524)).toBe(true);
    expect(isRetryableBackendStatus(400)).toBe(false);
    expect(isRetryableBackendStatus(413)).toBe(false);
  });

  it('creates stable upload ids for retrying the same file without duplicate objects', async () => {
    const file = new File(['mask'], 'mask.png', {
      type: 'image/png',
      lastModified: 1770000000000,
    });

    const firstId = await createDeterministicUploadId('run-1', metadata, file);
    const retryId = await createDeterministicUploadId('run-1', metadata, file);
    const otherRunId = await createDeterministicUploadId('run-2', metadata, file);

    expect(retryId).toBe(firstId);
    expect(otherRunId).not.toBe(firstId);
  });
});
