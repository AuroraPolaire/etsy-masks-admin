import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import { runQA } from '../qa';

import type { ManagedFile } from '../../types';

const makeFile = (
  name: string,
  mappedSubjectId: string,
  overrides: Partial<ManagedFile> = {},
): ManagedFile => {
  const file = new File(['image'], name, { type: 'image/png' });

  return {
    id: crypto.randomUUID(),
    file,
    name,
    originalName: name,
    size: file.size,
    type: file.type,
    addedAt: new Date().toISOString(),
    kind: 'uploaded',
    assetVariant: name.endsWith('-coloring-page.png') ? 'coloring-page' : 'color',
    imageMetadata: { width: 3000, height: 3000 },
    reviewState: 'approved',
    reviewNotes: 'Checked eye holes.',
    mappedSubjectId,
    explicitlyConfirmed: true,
    ...overrides,
  };
};

describe('QA checks', () => {
  it('fails critical checks when approved mapped images are missing', () => {
    const project = createDefaultProject();
    const result = runQA(project, []);

    expect(result.criticalPassed).toBe(false);
    expect(result.checks.find((check) => check.id === 'approved-images')?.status).toBe('fail');
  });

  it('passes approved image critical check when every subject has a mapped approval', () => {
    const project = {
      ...createDefaultProject(),
      settings: {
        ...createDefaultProject().settings,
        title: 'Woodland Printable Masks, 2 PNG Paper Masks, Digital Download',
      },
      subjects: [
        { id: 'fox', name: 'Fox' },
        { id: 'owl', name: 'Owl' },
      ],
    };
    const files = project.subjects.map((subject) => makeFile(`${subject.name}.png`, subject.id));
    const result = runQA(project, files);

    expect(result.checks.find((check) => check.id === 'approved-images')?.status).toBe('pass');
    expect(result.checks.find((check) => check.id === 'approved-coloring-pages')?.status).toBe(
      'fail',
    );
  });

  it('passes coloring page critical check when every subject has an approved line-art image', () => {
    const project = {
      ...createDefaultProject(),
      subjects: [{ id: 'fox', name: 'Fox' }],
    };
    const result = runQA(project, [
      makeFile('fox.png', 'fox'),
      makeFile('fox-coloring-page.png', 'fox'),
    ]);

    expect(result.checks.find((check) => check.id === 'approved-coloring-pages')?.status).toBe(
      'pass',
    );
  });

  it('fails coloring page critical check when the line-art image is stale', () => {
    const project = {
      ...createDefaultProject(),
      subjects: [{ id: 'fox', name: 'Fox' }],
    };
    const result = runQA(project, [
      makeFile('fox.png', 'fox', { id: 'fox-color-v2' }),
      makeFile('fox-coloring-page.png', 'fox', { sourceFileId: 'fox-color-v1' }),
    ]);

    expect(result.checks.find((check) => check.id === 'approved-coloring-pages')?.status).toBe(
      'fail',
    );
  });
});
