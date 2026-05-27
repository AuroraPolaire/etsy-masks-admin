import { describe, expect, it } from 'vitest';

import {
  createPromptItems,
  getColoringPageFilename,
  getCurrentColoringPageForSubject,
  getExpectedFilename,
  getFileForSubject,
  groupFilesForExport,
} from '../files';

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
  overrides: Partial<ManagedFile> = {},
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
    assetVariant: name.endsWith('-coloring-page.png') ? 'coloring-page' : 'color',
    imageMetadata: { width: 2500, height: 2500 },
    reviewState,
    reviewNotes: '',
    ...(mappedSubjectId ? { mappedSubjectId } : {}),
    explicitlyConfirmed: false,
    ...overrides,
  };
};

describe('file helpers', () => {
  it('builds expected filenames from subject names', () => {
    expect(getExpectedFilename('Snow Owl')).toBe('snow-owl.png');
    expect(getColoringPageFilename('Snow Owl')).toBe('snow-owl-coloring-page.png');
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
    expect(prompt?.prompt).toContain('Only the eye holes may be cut through the mask');
    expect(prompt?.prompt).toContain('do not add side punch holes');
    expect(prompt?.prompt).toContain('extra circular cutouts');
    expect(prompt?.prompt).toContain('without any black cutting outline');
    expect(prompt?.negativeRequirements).toContain('no multiple masks');
    expect(prompt?.negativeRequirements).toContain('no side holes');
    expect(prompt?.negativeRequirements).toContain('no round punch holes');
    expect(prompt?.negativeRequirements).toContain('no attachment holes');
    expect(prompt?.negativeRequirements).toContain('no black outline');
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

  it('groups approved coloring pages separately from color masks', () => {
    const colorFile = makeFile('color', 'lion.png', 'approved', 'lion');
    const files = [
      colorFile,
      makeFile('coloring', 'lion-coloring-page.png', 'approved', 'lion', {
        sourceFileId: 'color',
      }),
    ];

    const groups = groupFilesForExport(files, subjects);

    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['color']);
    expect(groups.approvedColoringPages.map((file) => file.id)).toEqual(['coloring']);
    expect(getFileForSubject(files, 'lion')?.id).toBe('color');
    expect(getFileForSubject(files, 'lion', 'approved', 'coloring-page')?.id).toBe('coloring');
    expect(getCurrentColoringPageForSubject(files, 'lion', colorFile)?.id).toBe('coloring');
  });

  it('does not export stale generated coloring pages for replaced color masks', () => {
    const newColorFile = makeFile('new-color', 'lion.png', 'approved', 'lion');
    const files = [
      makeFile('old-color', 'old-lion.png', 'approved', 'lion'),
      newColorFile,
      makeFile('stale-coloring', 'lion-coloring-page.png', 'approved', 'lion', {
        sourceFileId: 'old-color',
      }),
      makeFile('current-coloring', 'lion-coloring-page-v2.png', 'approved', 'lion', {
        assetVariant: 'coloring-page',
        sourceFileId: 'new-color',
      }),
    ];

    const groups = groupFilesForExport(files.slice(1), subjects);

    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['new-color']);
    expect(groups.approvedColoringPages.map((file) => file.id)).toEqual(['current-coloring']);
    expect(getCurrentColoringPageForSubject(files, 'lion', newColorFile)?.id).toBe(
      'current-coloring',
    );
  });

  it('treats duplicate approved subject mappings as unused after the newest file', () => {
    const files = [
      makeFile('first', 'lion-a.png', 'approved', 'lion', {
        addedAt: '2026-05-27T10:00:00.000Z',
      }),
      makeFile('second', 'lion-b.png', 'approved', 'lion', {
        addedAt: '2026-05-27T10:01:00.000Z',
      }),
    ];

    const groups = groupFilesForExport(files, subjects);

    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['second']);
    expect(groups.unused.map((file) => file.id)).toEqual(['first']);
    expect(getFileForSubject(files, 'lion')?.id).toBe('second');
  });

  it('uses addedAt to pick the latest mask variant even when files are not sorted', () => {
    const newestColorFile = makeFile('new-color', 'lion-new.png', 'approved', 'lion', {
      addedAt: '2026-05-27T10:02:00.000Z',
    });
    const files = [
      newestColorFile,
      makeFile('old-color', 'lion-old.png', 'approved', 'lion', {
        addedAt: '2026-05-27T10:00:00.000Z',
      }),
      makeFile('stale-coloring', 'lion-coloring-page.png', 'approved', 'lion', {
        addedAt: '2026-05-27T10:01:00.000Z',
        assetVariant: 'coloring-page',
        sourceFileId: 'old-color',
      }),
      makeFile('current-coloring', 'lion-coloring-page-2.png', 'approved', 'lion', {
        addedAt: '2026-05-27T10:03:00.000Z',
        assetVariant: 'coloring-page',
        sourceFileId: 'new-color',
      }),
    ];

    const groups = groupFilesForExport(files, subjects);

    expect(getFileForSubject(files, 'lion')?.id).toBe('new-color');
    expect(getCurrentColoringPageForSubject(files, 'lion', newestColorFile)?.id).toBe(
      'current-coloring',
    );
    expect(groups.approvedMapped.map((file) => file.id)).toEqual(['new-color']);
    expect(groups.approvedColoringPages.map((file) => file.id)).toEqual(['current-coloring']);
  });
});
