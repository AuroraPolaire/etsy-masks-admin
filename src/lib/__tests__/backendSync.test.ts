import { describe, expect, it } from 'vitest';

import { findReusableBackendDraftRun } from '../backendSync';

import type { BackendRunSummary } from '../../types';

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
});
