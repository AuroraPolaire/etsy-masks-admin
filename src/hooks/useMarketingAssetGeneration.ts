import { useCallback } from 'react';

import { makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import { createManagedFile } from '../lib/files';
import {
  CHILDREN_SCENE_RECIPES,
  createMarketingAssetMetadata,
  findReusableFinalMarketingAsset,
  getApprovedMarketingSourceMasks,
  getChildrenSceneRecipe,
  getSelectedChildrenSceneMasks,
  MASK_SHEET_PAGE_SIZE,
  normalizeMarketingImageSettings,
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
    reviewNotes: `${metadata.stage === 'final' ? 'Final' : 'Preview'} marketing asset generated from approved masks.`,
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
      sourceMasks,
      settings,
    }),
    reviewState,
  });

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
        let generatedCount = 0;

        for (let optionIndex = 0; optionIndex < 3; optionIndex += 1) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const recipe: MarketingGenerationRecipe = {
            type: 'slogan-poster',
            id: `slogan-${optionIndex + 1}`,
            optionIndex,
            stage: 'preview',
            maskCount: sourceMasks.length,
          };

          context?.setProgress(`Generating AI slogan preview ${optionIndex + 1}/3...`);
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
            reviewState: 'pending',
          });
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          `Generated ${generatedCount} slogan poster preview${generatedCount === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate slogan previews.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  const finalizeSloganPoster = useCallback(
    async (previewFileId: string, context?: BusyActionContext) => {
      const preview = filesRef.current.find((file) => file.id === previewFileId);
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      const optionIndex = preview?.marketingAsset?.optionIndex ?? 0;
      if (!preview || sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Generate a slogan preview first.');
        return;
      }

      try {
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const recipe: MarketingGenerationRecipe = {
          type: 'slogan-poster',
          id: preview.marketingAsset?.recipeId ?? `slogan-${optionIndex + 1}`,
          optionIndex,
          stage: 'final',
          maskCount: sourceMasks.length,
        };
        const reusableFile = findReusableFinalMarketingAsset({
          files: filesRef.current,
          type: 'slogan-poster',
          recipe,
          sourceMasks,
          settings,
        });
        if (reusableFile) {
          addActivity(
            'marketing-generated',
            'success',
            'Reused the existing final slogan poster with matching final settings.',
          );
          return;
        }

        context?.setProgress('Creating final slogan poster...');
        const file = await generateMarketingSceneFile(
          settings,
          project,
          sourceMasks,
          recipe,
          context?.signal,
        );
        const uniqueFile = makeUniqueFileWithReservedNames(
          file,
          getReservedNames(filesRef.current),
        );
        const managedFile = await createAiMarketingFile({
          file: uniqueFile,
          project,
          type: 'slogan-poster',
          recipe,
          sourceMasks,
          settings,
          reviewState: 'approved',
        });

        await appendGeneratedFiles([managedFile], context);
        addActivity('marketing-generated', 'success', 'Generated the final slogan poster.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate the final slogan poster.',
        );
      }
    },
    [addActivity, appendGeneratedFiles, filesRef, generateMarketingSceneFile, project],
  );

  const generateMaskSheets = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Approve at least one color mask first.');
        return;
      }

      try {
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const pageCount = Math.ceil(sourceMasks.length / MASK_SHEET_PAGE_SIZE);
        const reservedNames = getReservedNames(filesRef.current);
        let generatedCount = 0;
        let reusedCount = 0;

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
            id: 'mask-sheet-editorial',
            optionIndex: pageIndex,
            stage: 'final',
            maskCount: pageMasks.length,
            pageIndex,
            pageCount,
          };

          const reusableFile = findReusableFinalMarketingAsset({
            files: filesRef.current,
            type: 'mask-sheet',
            recipe,
            sourceMasks: pageMasks,
            settings,
          });
          if (reusableFile) {
            reusedCount += 1;
            continue;
          }

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
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          reusedCount === 0
            ? `Generated ${generatedCount} mask sheet image${generatedCount === 1 ? '' : 's'}.`
            : generatedCount === 0
              ? `Reused ${reusedCount} existing mask sheet image${reusedCount === 1 ? '' : 's'} with matching final settings.`
              : `Generated ${generatedCount} mask sheet image${generatedCount === 1 ? '' : 's'} and reused ${reusedCount} existing.`,
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
        let generatedCount = 0;

        for (const [optionIndex, recipe] of CHILDREN_SCENE_RECIPES.entries()) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const recipeInput: MarketingGenerationRecipe = {
            type: 'children-scene',
            id: recipe.id,
            optionIndex,
            stage: 'preview',
            maskCount: sourceMasks.length,
          };

          context?.setProgress(`Generating AI children scene preview ${optionIndex + 1}/3...`);
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
            reviewState: 'pending',
          });
          generatedCount += 1;
          appendVisibleMarketingFile(managedFile);
        }

        addActivity(
          'marketing-generated',
          'success',
          `Generated ${generatedCount} children scene preview${generatedCount === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate children scene previews.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  const finalizeChildrenScene = useCallback(
    async (previewFileId: string, context?: BusyActionContext) => {
      const preview = filesRef.current.find((file) => file.id === previewFileId);
      const optionIndex = preview?.marketingAsset?.optionIndex ?? 0;
      const recipe = getChildrenSceneRecipe(optionIndex);
      const sourceMasks = getSelectedChildrenSceneMasks(
        project,
        getApprovedMarketingSourceMasks(project, filesRef.current),
      );
      if (!preview || sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Generate a children scene preview first.');
        return;
      }

      try {
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const recipeInput: MarketingGenerationRecipe = {
          type: 'children-scene',
          id: recipe.id,
          optionIndex,
          stage: 'final',
          maskCount: sourceMasks.length,
        };
        const reusableFile = findReusableFinalMarketingAsset({
          files: filesRef.current,
          type: 'children-scene',
          recipe: recipeInput,
          sourceMasks,
          settings,
        });
        if (reusableFile) {
          addActivity(
            'marketing-generated',
            'success',
            'Reused the existing final children scene with matching final settings.',
          );
          return;
        }

        context?.setProgress('Generating final children scene...');
        const file = await generateMarketingSceneFile(
          settings,
          project,
          sourceMasks,
          recipeInput,
          context?.signal,
        );
        const uniqueFile = makeUniqueFileWithReservedNames(
          file,
          getReservedNames(filesRef.current),
        );
        const managedFile = await createAiMarketingFile({
          file: uniqueFile,
          project,
          type: 'children-scene',
          recipe: recipeInput,
          sourceMasks,
          settings,
          reviewState: 'approved',
        });

        await appendGeneratedFiles([managedFile], context);
        addActivity('marketing-generated', 'success', 'Generated the final children scene.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate the final children scene.',
        );
      }
    },
    [addActivity, appendGeneratedFiles, filesRef, generateMarketingSceneFile, project],
  );

  return {
    generateSloganPreviews,
    finalizeSloganPoster,
    generateMaskSheets,
    generateChildrenScenePreviews,
    finalizeChildrenScene,
  };
};
