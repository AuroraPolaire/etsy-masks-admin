import { describe, expect, it } from 'vitest';

import { createPromptItems, getExpectedFilename, groupFilesForExport } from '../files';

import type { SubjectItem, ManagedFile } from '../../types';

const subjects: SubjectItem[] = [
  { id: 'lion', name: 'Lion' },
  { id: 'snow-owl', name: 'Snow Owl' },
];

const makeFile = (
  id: string,
  name: string,
  reviewState: ManagedFile['reviewState'],
  mappedSubjectId?: string,
): ManagedFile => {
  const file = new File(['image'], name, { type: 'image/png' });

  return {
    id,
    file,
    name,
    originalName: name,
    size: file.size,
    type: file.type,
    addedAt: new Date().toISOString(),
    kind: 'uploaded',
    imageMetadata: { width: 2500, height: 2500 },
    reviewState,
    reviewNotes: '',
    ...(mappedSubjectId ? { mappedSubjectId } : {}),
    explicitlyConfirmed: false,
  };
};

describe('file helpers', () => {
  it('builds expected filenames from subject names', () => {
    expect(getExpectedFilename('Snow Owl')).toBe('snow-owl.png');
  });

  it('builds print-ready prompts that match the target mask output constraints', () => {
    const [prompt] = createPromptItems([{ id: 'turtle', name: 'Turtle' }], {
      style: 'realistic mask for kids with eye holes and white background, front view, no shadows',
    });

    expect(prompt?.expectedFilename).toBe('turtle.png');
    expect(prompt?.prompt).toContain('white background');
    expect(prompt?.prompt).toContain('front view');
    expect(prompt?.prompt).toContain('no shadows');
    expect(prompt?.prompt).toContain('Clearly cut human eye holes');
    expect(prompt?.negativeRequirements).toContain('no multiple masks');
  });

  it('groups files for export', () => {
    const files = [
      makeFile('approved', 'lion-source.png', 'approved', 'lion'),
      makeFile('rejected', 'bad-lion.png', 'rejected', 'lion'),
      makeFile('unused', 'extra.png', 'pending'),
    ];

    const groups = groupFilesForExport(files, subjects);

    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['approved']);
    expect(groups.rejected.map((file) => file.id)).toEqual(['rejected']);
    expect(groups.unused.map((file) => file.id)).toEqual(['unused']);
  });

  it('treats duplicate approved subject mappings as unused after the first file', () => {
    const files = [
      makeFile('first', 'lion-a.png', 'approved', 'lion'),
      makeFile('second', 'lion-b.png', 'approved', 'lion'),
    ];

    const groups = groupFilesForExport(files, subjects);

    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['first']);
    expect(groups.unused.map((file) => file.id)).toEqual(['second']);
  });
});
