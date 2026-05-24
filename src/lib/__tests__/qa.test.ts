import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import { detectBlockedTerms, runQA } from '../qa';

import type { ManagedFile } from '../../types';

const makeFile = (name: string, mappedSubjectId: string): ManagedFile => {
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
    imageMetadata: { width: 3000, height: 3000 },
    reviewState: 'approved',
    reviewNotes: 'Checked eye holes.',
    mappedSubjectId,
    explicitlyConfirmed: true,
  };
};

describe('QA checks', () => {
  it('detects blocked marketplace IP terms', () => {
    expect(detectBlockedTerms(['Cute Disney style mask', 'safe listing'])).toEqual(['disney']);
  });

  it('fails critical checks when approved mapped images are missing', () => {
    const project = createDefaultProject();
    const result = runQA(project, []);

    expect(result.criticalPassed).toBe(false);
    expect(result.checks.find((check) => check.id === 'approved-images')?.status).toBe('fail');
  });

  it('passes approved image critical check when every subject has a mapped approval', () => {
    const project = createDefaultProject();
    const files = project.subjects.map((subject) => makeFile(`${subject.name}.png`, subject.id));
    const result = runQA(project, files);

    expect(result.checks.find((check) => check.id === 'approved-images')?.status).toBe('pass');
  });
});
