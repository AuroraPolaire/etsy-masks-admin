import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultProject } from '../../constants';
import { createScriptedMaskSheetFile } from '../../lib/scriptedMaskSheet';
import { useMarketingAssetGeneration } from '../useMarketingAssetGeneration';

import type {
  ManagedFile,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  Project,
} from '../../types';

vi.mock('../../lib/scriptedMaskSheet', () => ({
  createScriptedMaskSheetFile: vi.fn(),
}));

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
  beforeEach(() => {
    vi.mocked(createScriptedMaskSheetFile).mockReset();
    vi.mocked(createScriptedMaskSheetFile).mockResolvedValue(
      new File(['scripted sheet'], 'scripted-mask-sheet.bin'),
    );
  });

  const createGenerateMarketingSceneFileMock = () =>
    vi.fn(
      (
        _settings: MarketingImageSettings,
        _project: Project,
        _sourceFiles: ManagedFile[],
        recipe: MarketingGenerationRecipe,
      ) => Promise.resolve(new File(['ai slogan'], `ai-slogan-${recipe.optionIndex}.bin`)),
    );

  it('generates three AI text-only slogan poster variations without source masks', async () => {
    const project = createProject();
    const filesRef = { current: [createApprovedMask()] };
    const generateMarketingSceneFile = createGenerateMarketingSceneFileMock();
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

    expect(generateMarketingSceneFile).toHaveBeenCalledTimes(3);
    expect(
      generateMarketingSceneFile.mock.calls.map((call) => ({
        sourceFiles: call[2],
        recipe: call[3],
      })),
    ).toMatchObject([
      {
        sourceFiles: [],
        recipe: { type: 'slogan-poster', stage: 'final', optionIndex: 0, maskCount: 0 },
      },
      {
        sourceFiles: [],
        recipe: { type: 'slogan-poster', stage: 'final', optionIndex: 1, maskCount: 0 },
      },
      {
        sourceFiles: [],
        recipe: { type: 'slogan-poster', stage: 'final', optionIndex: 2, maskCount: 0 },
      },
    ]);
    await waitFor(() => expect(appendGeneratedFiles).toHaveBeenCalledTimes(3));
    expect(appendGeneratedFiles.mock.calls[0]?.[0][0]).toMatchObject({
      assetVariant: 'marketing-slogan',
      reviewState: 'approved',
      explicitlyConfirmed: true,
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        optionIndex: 0,
        sourceFileIds: [],
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
    const existing = createMarketingFile('final-slogan', { stage: 'final' });
    const filesRef = { current: [existing] };
    const generateMarketingSceneFile = createGenerateMarketingSceneFileMock();
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

  it('creates mask sheets locally without calling the AI marketing image generator', async () => {
    const project = createProject();
    const sourceMask = createApprovedMask();
    const filesRef = { current: [sourceMask] };
    const generateMarketingSceneFile = createGenerateMarketingSceneFileMock();
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
      await result.current.generateMaskSheets({
        signal: new AbortController().signal,
        setProgress: vi.fn(),
      });
    });

    expect(generateMarketingSceneFile).not.toHaveBeenCalled();
    const scriptedSheetCalls = vi.mocked(createScriptedMaskSheetFile).mock.calls;
    const firstScriptedSheetCall = scriptedSheetCalls[0];
    if (!firstScriptedSheetCall) {
      throw new Error('Expected scripted mask sheet generation to be called.');
    }

    const [scriptedSheetInput] = firstScriptedSheetCall;
    expect(scriptedSheetInput.sourceMasks).toEqual([sourceMask]);
    expect(scriptedSheetInput.recipe).toMatchObject({
      type: 'mask-sheet',
      stage: 'final',
      pageCount: 1,
    });
    expect(appendGeneratedFiles).toHaveBeenCalledTimes(1);
    expect(appendGeneratedFiles.mock.calls[0]?.[0][0]).toMatchObject({
      assetVariant: 'marketing-mask-sheet',
      reviewState: 'approved',
      marketingAsset: {
        type: 'mask-sheet',
        stage: 'final',
      },
    });
  });
});
