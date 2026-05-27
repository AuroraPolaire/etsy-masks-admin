import { useCallback } from 'react';

import { makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import { createManagedFile } from '../lib/files';
import {
  createMarketingAssetMetadata,
  getApprovedMarketingSourceMasks,
  getChildrenSceneRecipe,
  getMarketingAssetFiles,
  getSelectedChildrenSceneMasks,
  MASK_SHEET_PAGE_SIZE,
  resolveMarketingPreviewSettings,
} from '../lib/marketingAssets';

import type {
  AddActivity,
  BusyActionContext,
  ManagedFile,
  MarketingAssetMetadata,
  MarketingAssetType,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  Project,
} from '../types';
import type { MutableRefObject } from 'react';

type GenerateMarketingSceneFile = (
  settings: MarketingImageSettings,
  project: Project,
  sourceFiles: ManagedFile[],
  recipe: MarketingGenerationRecipe,
  signal?: AbortSignal,
) => Promise<File>;

type UseMarketingAssetGenerationParams = {
  project: Project;
  filesRef: MutableRefObject<ManagedFile[]>;
  appendGeneratedFiles: (files: ManagedFile[], context?: BusyActionContext) => Promise<void>;
  addActivity: AddActivity;
  generateMarketingSceneFile: GenerateMarketingSceneFile;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const createGeneratedMarketingFile = async ({
  file,
  project,
  assetVariant,
  metadata,
  reviewState,
}: {
  file: File;
  project: Project;
  assetVariant: ManagedFile['assetVariant'];
  metadata: MarketingAssetMetadata;
  reviewState: ManagedFile['reviewState'];
}): Promise<ManagedFile> => {
  const managedFile = await createManagedFile(file, project.subjects);

  return {
    ...managedFile,
    kind: 'generated-preview',
    assetVariant,
    reviewState,
    explicitlyConfirmed: reviewState === 'approved',
    marketingAsset: metadata,
    reviewNotes: 'Marketing asset generated from approved masks.',
  };
};

const getReservedNames = (files: ManagedFile[]) =>
  new Set(files.map((file) => file.name.toLowerCase()));

const getAssetVariant = (type: MarketingAssetType): ManagedFile['assetVariant'] => {
  if (type === 'mask-sheet') {
    return 'marketing-mask-sheet';
  }

  if (type === 'children-scene') {
    return 'marketing-children-scene';
  }

  return 'marketing-slogan';
};

const createAiMarketingFile = async ({
  project,
  file,
  type,
  recipe,
  sourceMasks,
  settings,
  reviewState,
}: {
  project: Project;
  file: File;
  type: MarketingAssetType;
  recipe: MarketingGenerationRecipe;
  sourceMasks: ManagedFile[];
  settings: MarketingImageSettings;
  reviewState: ManagedFile['reviewState'];
}): Promise<ManagedFile> =>
  createGeneratedMarketingFile({
    file,
    project,
    assetVariant: getAssetVariant(type),
    metadata: createMarketingAssetMetadata({
      type,
      stage: recipe.stage,
      optionIndex: recipe.optionIndex,
      recipeId: recipe.id,
      ...(recipe.customPrompt ? { customPrompt: recipe.customPrompt } : {}),
      sourceMasks,
      settings,
    }),
    reviewState,
  });

const getExistingAssetCount = (files: ManagedFile[], type: MarketingAssetType): number =>
  getMarketingAssetFiles(files, type, 'final').length;

const getAdditionalPrompt = (project: Project): string | undefined => {
  const prompt = project.marketingSettings.additionalPrompt.trim();
  return prompt.length > 0 ? prompt : undefined;
};

export const useMarketingAssetGeneration = ({
  project,
  filesRef,
  appendGeneratedFiles,
  addActivity,
  generateMarketingSceneFile,
}: UseMarketingAssetGenerationParams) => {
  const appendVisibleMarketingFile = useCallback(
    (managedFile: ManagedFile) => {
      void appendGeneratedFiles([managedFile]).catch((error) => {
        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not queue generated marketing asset.',
        );
      });
    },
    [addActivity, appendGeneratedFiles],
  );

  const generateSloganPreviews = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Approve at least one color mask first.');
        return;
      }

      try {
        const settings = resolveMarketingPreviewSettings(project);
        const reservedNames = getReservedNames(filesRef.current);
        const optionStart = getExistingAssetCount(filesRef.current, 'slogan-poster');
        const customPrompt = getAdditionalPrompt(project);
        let generatedCount = 0;

        for (let offset = 0; offset < 3; offset += 1) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const optionIndex = optionStart + offset;
          const recipe: MarketingGenerationRecipe = {
            type: 'slogan-poster',
            id: `slogan-${optionIndex + 1}`,
            optionIndex,
            stage: 'final',
            maskCount: sourceMasks.length,
            ...(customPrompt ? { customPrompt } : {}),
          };

          context?.setProgress(`Generating AI slogan suggestion ${offset + 1}/3...`);
          const file = await generateMarketingSceneFile(
            settings,
            project,
            sourceMasks,
            recipe,
            context?.signal,
          );
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          const managedFile = await createAiMarketingFile({
            file: uniqueFile,
            project,
            type: 'slogan-poster',
            recipe,
            sourceMasks,
            settings,
            reviewState: 'approved',
          });
          reservedNames.add(uniqueFile.name.toLowerCase());
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          `Generated ${generatedCount} slogan poster suggestion${generatedCount === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate slogan suggestions.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  const generateMaskSheets = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Approve at least one color mask first.');
        return;
      }

      try {
        const settings = resolveMarketingPreviewSettings(project);
        const pageCount = Math.ceil(sourceMasks.length / MASK_SHEET_PAGE_SIZE);
        const reservedNames = getReservedNames(filesRef.current);
        const optionStart = getExistingAssetCount(filesRef.current, 'mask-sheet');
        const customPrompt = getAdditionalPrompt(project);
        let generatedCount = 0;

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const pageMasks = sourceMasks.slice(
            pageIndex * MASK_SHEET_PAGE_SIZE,
            (pageIndex + 1) * MASK_SHEET_PAGE_SIZE,
          );
          const recipe: MarketingGenerationRecipe = {
            type: 'mask-sheet',
            id: `mask-sheet-${optionStart + pageIndex + 1}`,
            optionIndex: optionStart + pageIndex,
            stage: 'final',
            maskCount: pageMasks.length,
            ...(customPrompt ? { customPrompt } : {}),
            pageIndex,
            pageCount,
          };

          context?.setProgress(`Generating AI mask sheet ${pageIndex + 1}/${pageCount}...`);
          const file = await generateMarketingSceneFile(
            settings,
            project,
            pageMasks,
            recipe,
            context?.signal,
          );
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          const managedFile = await createAiMarketingFile({
            file: uniqueFile,
            project,
            type: 'mask-sheet',
            recipe,
            sourceMasks: pageMasks,
            settings,
            reviewState: 'approved',
          });
          reservedNames.add(uniqueFile.name.toLowerCase());
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          `Generated ${generatedCount} mask sheet image${generatedCount === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate mask sheets.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  const generateChildrenScenePreviews = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getSelectedChildrenSceneMasks(
        project,
        getApprovedMarketingSourceMasks(project, filesRef.current),
      );
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Approve at least one color mask first.');
        return;
      }

      try {
        const settings = resolveMarketingPreviewSettings(project);
        const reservedNames = getReservedNames(filesRef.current);
        const optionStart = getExistingAssetCount(filesRef.current, 'children-scene');
        const customPrompt = getAdditionalPrompt(project);
        let generatedCount = 0;

        for (let offset = 0; offset < 3; offset += 1) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const optionIndex = optionStart + offset;
          const recipe = getChildrenSceneRecipe(optionIndex);
          const recipeInput: MarketingGenerationRecipe = {
            type: 'children-scene',
            id: recipe.id,
            optionIndex,
            stage: 'final',
            maskCount: sourceMasks.length,
            ...(customPrompt ? { customPrompt } : {}),
          };

          context?.setProgress(`Generating AI children scene suggestion ${offset + 1}/3...`);
          const file = await generateMarketingSceneFile(
            settings,
            project,
            sourceMasks,
            recipeInput,
            context?.signal,
          );
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          const managedFile = await createAiMarketingFile({
            file: uniqueFile,
            project,
            type: 'children-scene',
            recipe: recipeInput,
            sourceMasks,
            settings,
            reviewState: 'approved',
          });
          reservedNames.add(uniqueFile.name.toLowerCase());
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          `Generated ${generatedCount} children scene suggestion${generatedCount === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate children scene suggestions.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  return {
    generateSloganPreviews,
    generateMaskSheets,
    generateChildrenScenePreviews,
  };
};
