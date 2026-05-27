import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultProject } from '../../constants';
import { useMarketingAssetGeneration } from '../useMarketingAssetGeneration';

import type {
  ManagedFile,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  Project,
} from '../../types';

const createProject = (): Project => ({
  ...createDefaultProject(),
  subjects: [{ id: 'dino', name: 'Dinosaur' }],
});

const createApprovedMask = (): ManagedFile => {
  const file = new File(['mask'], 'dinosaur-mask.png', { type: 'image/png' });

  return {
    id: 'dino-mask',
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-27T10:00:00.000Z',
    kind: 'uploaded',
    reviewState: 'approved',
    reviewNotes: '',
    mappedSubjectId: 'dino',
    assetVariant: 'color',
    explicitlyConfirmed: true,
    imageMetadata: { width: 1024, height: 1024 },
  };
};

const createMarketingFile = (
  id: string,
  overrides: Partial<ManagedFile['marketingAsset']> & {
    stage: NonNullable<ManagedFile['marketingAsset']>['stage'];
  },
  reviewState: ManagedFile['reviewState'] = 'approved',
): ManagedFile => {
  const file = new File(['marketing'], `${id}.png`, { type: 'image/png' });

  return {
    id,
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-27T10:00:00.000Z',
    kind: 'generated-preview',
    reviewState,
    reviewNotes: '',
    assetVariant: 'marketing-slogan',
    explicitlyConfirmed: reviewState === 'approved',
    imageMetadata: { width: 2048, height: 2048 },
    marketingAsset: {
      type: 'slogan-poster',
      recipeId: 'slogan-1',
      optionIndex: 0,
      sourceFileIds: ['dino-mask'],
      generatedFromSettings: createDefaultProject().marketingSettings.preview.customSettings,
      generatedAt: '2026-05-27T10:00:00.000Z',
      ...overrides,
    },
  };
};

describe('useMarketingAssetGeneration', () => {
  it('appends saved slogan suggestions as soon as each one is generated', async () => {
    const project = createProject();
    const filesRef = { current: [createApprovedMask()] };
    const resolvers: Array<(file: File) => void> = [];
    const generateMarketingSceneFile = vi.fn(
      () =>
        new Promise<File>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const appendGeneratedFiles = vi.fn((files: ManagedFile[]) => {
      filesRef.current = [...filesRef.current, ...files];
      return Promise.resolve();
    });
    const addActivity = vi.fn();
    const { result } = renderHook(() =>
      useMarketingAssetGeneration({
        project,
        filesRef,
        appendGeneratedFiles,
        addActivity,
        generateMarketingSceneFile,
      }),
    );

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.generateSloganPreviews({
        signal: new AbortController().signal,
        setProgress: vi.fn(),
      });
    });

    expect(generateMarketingSceneFile).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvers[0]?.(new File(['preview-1'], 'preview-1.bin'));
      await Promise.resolve();
    });
    await waitFor(() => expect(appendGeneratedFiles).toHaveBeenCalledTimes(1));
    expect(generateMarketingSceneFile).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers[1]?.(new File(['preview-2'], 'preview-2.bin'));
      await Promise.resolve();
    });
    await waitFor(() => expect(appendGeneratedFiles).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(generateMarketingSceneFile).toHaveBeenCalledTimes(3));

    await act(async () => {
      resolvers[2]?.(new File(['preview-3'], 'preview-3.bin'));
      await generatePromise;
    });
    await waitFor(() => expect(appendGeneratedFiles).toHaveBeenCalledTimes(3));
    expect(appendGeneratedFiles.mock.calls[0]?.[0][0]).toMatchObject({
      assetVariant: 'marketing-slogan',
      reviewState: 'approved',
      explicitlyConfirmed: true,
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        optionIndex: 0,
      },
    });
  });

  it('generates the next three slogan suggestions with additional prompt context', async () => {
    const project = {
      ...createProject(),
      marketingSettings: {
        ...createProject().marketingSettings,
        additionalPrompt: 'Use warmer printer-table styling',
      },
    };
    const sourceMask = createApprovedMask();
    const existing = createMarketingFile('final-slogan', { stage: 'final' });
    const filesRef = { current: [sourceMask, existing] };
    let generatedIndex = 0;
    const generateMarketingSceneFile = vi.fn<
      (
        settings: MarketingImageSettings,
        project: Project,
        sourceFiles: ManagedFile[],
        recipe: MarketingGenerationRecipe,
      ) => Promise<File>
    >(() => {
      generatedIndex += 1;
      return Promise.resolve(new File(['marketing'], `next-${generatedIndex}.bin`));
    });
    const appendGeneratedFiles = vi.fn((files: ManagedFile[]) => {
      filesRef.current = [...filesRef.current, ...files];
      return Promise.resolve();
    });
    const addActivity = vi.fn();
    const { result } = renderHook(() =>
      useMarketingAssetGeneration({
        project,
        filesRef,
        appendGeneratedFiles,
        addActivity,
        generateMarketingSceneFile,
      }),
    );

    await act(async () => {
      await result.current.generateSloganPreviews({
        signal: new AbortController().signal,
        setProgress: vi.fn(),
      });
    });

    await waitFor(() => expect(generateMarketingSceneFile).toHaveBeenCalledTimes(3));
    expect(generateMarketingSceneFile.mock.calls.map((call) => call[3])).toMatchObject([
      { optionIndex: 1, customPrompt: 'Use warmer printer-table styling' },
      { optionIndex: 2, customPrompt: 'Use warmer printer-table styling' },
      { optionIndex: 3, customPrompt: 'Use warmer printer-table styling' },
    ]);
    expect(appendGeneratedFiles).toHaveBeenCalledTimes(3);
    expect(appendGeneratedFiles.mock.calls[0]?.[0][0]?.marketingAsset).toMatchObject({
      optionIndex: 1,
      customPrompt: 'Use warmer printer-table styling',
    });
  });
});
