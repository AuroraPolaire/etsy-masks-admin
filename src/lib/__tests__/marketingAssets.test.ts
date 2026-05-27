import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import {
  findReusableFinalMarketingAsset,
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

  it('normalizes legacy 512 marketing settings to the smallest supported GPT image size', () => {
    expect(
      normalizeMarketingImageSettings({
        model: 'gpt-image-2',
        size: '512x512',
        quality: 'low',
        background: 'opaque',
        outputFormat: 'png',
      }),
    ).toMatchObject({ size: '1024x1024' });
  });

  it('uses 1024 square previews by default while inheriting mask model and quality cap', () => {
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
      size: '1024x1024',
      quality: 'medium',
    });
  });

  it('uses custom marketing preview size when configured', () => {
    const project = {
      ...createProject(),
      marketingSettings: {
        ...createProject().marketingSettings,
        preview: {
          mode: 'custom',
          customSettings: {
            ...createProject().marketingSettings.preview.customSettings,
            size: '1024x1536',
          },
        },
      },
    } satisfies Project;

    expect(resolveMarketingPreviewSettings(project)).toMatchObject({
      size: '1024x1536',
    });
  });

  it('normalizes legacy custom marketing preview size', () => {
    const project = {
      ...createProject(),
      marketingSettings: {
        ...createProject().marketingSettings,
        preview: {
          mode: 'custom',
          customSettings: {
            ...createProject().marketingSettings.preview.customSettings,
            size: '512x512',
          },
        },
      },
    } satisfies Project;

    expect(resolveMarketingPreviewSettings(project)).toMatchObject({
      size: '1024x1024',
    });
  });

  it('defaults custom marketing preview settings to 1024 square', () => {
    expect(createDefaultProject().marketingSettings.preview.customSettings).toMatchObject({
      quality: 'low',
      size: '1024x1024',
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
        generatedFromSettings: createDefaultProject().marketingSettings.preview.customSettings,
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
        generatedFromSettings: createDefaultProject().marketingSettings.preview.customSettings,
      },
    });

    expect(getFinalMarketingAssetFiles([finalFile, previewFile]).map((file) => file.id)).toEqual([
      'final-slogan',
    ]);
  });

  it('finds reusable final marketing assets with matching recipe, sources, and generation settings', () => {
    const settings = createDefaultProject().marketingSettings.preview.customSettings;
    const lionMask = makeImageFile('lion-new', 'approved', 'lion');
    const owlMask = makeImageFile('owl-approved', 'approved', 'owl');
    const finalFile = makeImageFile('final-slogan', 'approved', undefined, {
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        optionIndex: 1,
        recipeId: 'slogan-2',
        sourceFileIds: ['lion-new', 'owl-approved'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: settings,
      },
    });

    expect(
      findReusableFinalMarketingAsset({
        files: [finalFile],
        type: 'slogan-poster',
        recipe: {
          type: 'slogan-poster',
          id: 'slogan-2',
          optionIndex: 1,
          stage: 'final',
          maskCount: 2,
        },
        sourceMasks: [lionMask, owlMask],
        settings,
      })?.id,
    ).toBe('final-slogan');
  });

  it('does not reuse final marketing assets generated with a different generation quality', () => {
    const settings = createDefaultProject().marketingSettings.preview.customSettings;
    const lionMask = makeImageFile('lion-new', 'approved', 'lion');
    const finalFile = makeImageFile('final-slogan', 'approved', undefined, {
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        optionIndex: 0,
        recipeId: 'slogan-1',
        sourceFileIds: ['lion-new'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: {
          ...settings,
          quality: 'medium',
        },
      },
    });

    expect(
      findReusableFinalMarketingAsset({
        files: [finalFile],
        type: 'slogan-poster',
        recipe: {
          type: 'slogan-poster',
          id: 'slogan-1',
          optionIndex: 0,
          stage: 'final',
          maskCount: 1,
        },
        sourceMasks: [lionMask],
        settings,
      }),
    ).toBeUndefined();
  });
});
