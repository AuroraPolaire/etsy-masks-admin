import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import {
  getApprovedMarketingSourceMasks,
  getFinalMarketingAssetFiles,
  getMaskSheetPageCount,
  normalizeMarketingImageSettings,
  resolveMarketingPreviewSettings,
} from '../marketingAssets';

import type { ManagedFile, Project } from '../../types';

const createProject = (): Project => ({
  ...createDefaultProject(),
  subjects: [
    { id: 'lion', name: 'Lion' },
    { id: 'owl', name: 'Owl' },
  ],
});

const makeImageFile = (
  id: string,
  reviewState: ManagedFile['reviewState'],
  mappedSubjectId: string | undefined,
  overrides: Partial<ManagedFile> = {},
): ManagedFile => {
  const file = new File(['image'], `${id}.png`, { type: 'image/png' });

  return {
    id,
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-26T10:00:00.000Z',
    kind: 'uploaded',
    reviewState,
    reviewNotes: '',
    assetVariant: 'color',
    ...(mappedSubjectId ? { mappedSubjectId } : {}),
    explicitlyConfirmed: reviewState === 'approved',
    imageMetadata: { width: 3000, height: 3000 },
    ...overrides,
  };
};

describe('marketing asset helpers', () => {
  it('uses only newest approved color masks in subject order', () => {
    const project = createProject();
    const files = [
      makeImageFile('lion-old', 'approved', 'lion'),
      makeImageFile('owl-pending', 'pending', 'owl'),
      makeImageFile('lion-new', 'approved', 'lion'),
      makeImageFile('owl-approved', 'approved', 'owl'),
      makeImageFile('owl-coloring', 'approved', 'owl', { assetVariant: 'coloring-page' }),
    ];

    expect(getApprovedMarketingSourceMasks(project, files).map((file) => file.id)).toEqual([
      'lion-new',
      'owl-approved',
    ]);
  });

  it('caps high quality marketing settings at medium', () => {
    expect(
      normalizeMarketingImageSettings({
        model: 'gpt-image-2',
        size: '2048x2048',
        quality: 'high',
        background: 'opaque',
        outputFormat: 'png',
      }),
    ).toMatchObject({ quality: 'medium' });
  });

  it('inherits mask preview settings with the same quality cap', () => {
    const project = {
      ...createProject(),
      openAIImageSettings: {
        model: 'gpt-image-1.5',
        size: '1024x1536',
        quality: 'high',
        background: 'opaque',
        outputFormat: 'png',
      },
    } satisfies Project;

    expect(resolveMarketingPreviewSettings(project)).toMatchObject({
      model: 'gpt-image-1.5',
      size: '1024x1536',
      quality: 'medium',
    });
  });

  it('defaults final marketing settings to medium quality and higher resolution', () => {
    expect(createDefaultProject().marketingSettings.final).toMatchObject({
      quality: 'medium',
      size: '2048x2048',
    });
  });

  it('paginates mask sheets by 16 masks per page', () => {
    expect(getMaskSheetPageCount(0)).toBe(0);
    expect(getMaskSheetPageCount(16)).toBe(1);
    expect(getMaskSheetPageCount(17)).toBe(2);
    expect(getMaskSheetPageCount(33)).toBe(3);
  });

  it('returns only approved final marketing files for archive export', () => {
    const finalFile = makeImageFile('final-slogan', 'approved', undefined, {
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        recipeId: 'slogan-1',
        sourceFileIds: ['lion-new'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: createDefaultProject().marketingSettings.final,
      },
    });
    const previewFile = makeImageFile('preview-slogan', 'approved', undefined, {
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'preview',
        recipeId: 'slogan-1',
        sourceFileIds: ['lion-new'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: createDefaultProject().marketingSettings.final,
      },
    });

    expect(getFinalMarketingAssetFiles([finalFile, previewFile]).map((file) => file.id)).toEqual([
      'final-slogan',
    ]);
  });
});
