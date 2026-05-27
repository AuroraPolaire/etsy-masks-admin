import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import {
  createAutosaveRevisionInput,
  groupRunRevisionsByStage,
  inferRunRevisionStage,
} from '../runHistory';

import type { ManagedFile, RunRevisionSummary } from '../../types';

const createFile = (overrides: Partial<ManagedFile>): ManagedFile => {
  const file = new File(['image'], overrides.name ?? 'mask.png', { type: 'image/png' });

  return {
    id: overrides.id ?? crypto.randomUUID(),
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-27T10:00:00.000Z',
    kind: 'uploaded',
    reviewState: 'pending',
    reviewNotes: '',
    assetVariant: 'color',
    explicitlyConfirmed: false,
    ...overrides,
  };
};

const createRevision = (
  sequenceNumber: number,
  stage: RunRevisionSummary['stage'],
): RunRevisionSummary => ({
  id: `revision-${sequenceNumber}`,
  runId: 'run-1',
  projectId: 'project-1',
  sequenceNumber,
  stage,
  kind: 'autosave',
  label: `${stage} ${sequenceNumber}`,
  fileCount: 0,
  totalSizeBytes: 0,
  isManual: false,
  isPinned: false,
  createdAt: `2026-05-27T10:0${sequenceNumber}:00.000Z`,
});

describe('run history helpers', () => {
  it('infers the highest meaningful workflow stage from current files', () => {
    const project = createDefaultProject();

    expect(inferRunRevisionStage(project, [])).toBe('brief');
    expect(inferRunRevisionStage(project, [createFile({})])).toBe('approval');
    expect(
      inferRunRevisionStage(project, [
        createFile({
          reviewState: 'approved',
          explicitlyConfirmed: true,
        }),
      ]),
    ).toBe('approval');
    expect(
      inferRunRevisionStage(project, [
        createFile({
          assetVariant: 'marketing-slogan',
        }),
      ]),
    ).toBe('marketing');
  });

  it('creates autosave restore point metadata with variant counts', () => {
    const project = createDefaultProject();
    const input = createAutosaveRevisionInput(project, [
      createFile({ reviewState: 'approved' }),
      createFile({ assetVariant: 'coloring-page' }),
    ]);

    expect(input.stage).toBe('coloring');
    expect(input.kind).toBe('generation');
    expect(input.changeSummary).toMatchObject({
      fileCount: 2,
      approvedMaskCount: 1,
      readyMaskCount: 1,
      filesByVariant: {
        color: 1,
        'coloring-page': 1,
      },
    });
  });

  it('groups revisions by workflow order and sorts newest first inside each group', () => {
    const groups = groupRunRevisionsByStage([
      createRevision(1, 'marketing'),
      createRevision(3, 'brief'),
      createRevision(2, 'marketing'),
    ]);

    expect(groups.map((group) => group.stage)).toEqual(['brief', 'marketing']);
    expect(groups[1]?.revisions.map((revision) => revision.sequenceNumber)).toEqual([2, 1]);
  });

  it('ignores malformed revision records while grouping history', () => {
    const groups = groupRunRevisionsByStage([
      undefined as unknown as RunRevisionSummary,
      { id: 'bad-revision' } as unknown as RunRevisionSummary,
      createRevision(1, 'brief'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.revisions.map((revision) => revision.id)).toEqual(['revision-1']);
  });
});
