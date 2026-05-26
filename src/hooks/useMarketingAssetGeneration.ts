import { useCallback } from 'react';

import { makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import { createManagedFile } from '../lib/files';
import {
  CHILDREN_SCENE_RECIPES,
  composeChildrenSceneFile,
  createMarketingAssetMetadata,
  createMaskSheetFiles,
  createSloganPosterFile,
  getApprovedMarketingSourceMasks,
  getChildrenSceneRecipe,
  getSelectedChildrenSceneMasks,
  normalizeMarketingImageSettings,
  resolveMarketingPreviewSettings,
} from '../lib/marketingAssets';

import type {
  AddActivity,
  BusyActionContext,
  ManagedFile,
  MarketingAssetMetadata,
  MarketingImageSettings,
  Project,
} from '../types';
import type { MutableRefObject } from 'react';

type GenerateMarketingSceneFile = (
  settings: MarketingImageSettings,
  project: Project,
  sourceFiles: ManagedFile[],
  recipe: { id: string; optionIndex: number; stage: 'preview' | 'final'; maskCount: number },
  signal?: AbortSignal,
) => Promise<File>;

type UseMarketingAssetGenerationParams = {
  project: Project;
  filesRef: MutableRefObject<ManagedFile[]>;
  appendFiles: (files: ManagedFile[]) => void;
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

export const useMarketingAssetGeneration = ({
  project,
  filesRef,
  appendFiles,
  addActivity,
  generateMarketingSceneFile,
}: UseMarketingAssetGenerationParams) => {
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
        const managedFiles: ManagedFile[] = [];

        for (let optionIndex = 0; optionIndex < 3; optionIndex += 1) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          context?.setProgress(`Creating slogan preview ${optionIndex + 1}/3...`);
          const file = await createSloganPosterFile({
            project,
            sourceMasks,
            optionIndex,
            stage: 'preview',
            settings,
          });
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          managedFiles.push(
            await createGeneratedMarketingFile({
              file: uniqueFile,
              project,
              assetVariant: 'marketing-slogan',
              metadata: createMarketingAssetMetadata({
                type: 'slogan-poster',
                stage: 'preview',
                optionIndex,
                recipeId: `slogan-${optionIndex + 1}`,
                sourceMasks,
                settings,
              }),
              reviewState: 'pending',
            }),
          );
        }

        appendFiles(managedFiles);
        addActivity('marketing-generated', 'success', 'Generated 3 slogan poster previews.');
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
    [addActivity, appendFiles, filesRef, project],
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
        context?.setProgress('Creating final slogan poster...');
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const file = await createSloganPosterFile({
          project,
          sourceMasks,
          optionIndex,
          stage: 'final',
          settings,
        });
        const uniqueFile = makeUniqueFileWithReservedNames(
          file,
          getReservedNames(filesRef.current),
        );
        const managedFile = await createGeneratedMarketingFile({
          file: uniqueFile,
          project,
          assetVariant: 'marketing-slogan',
          metadata: createMarketingAssetMetadata({
            type: 'slogan-poster',
            stage: 'final',
            optionIndex,
            recipeId: preview.marketingAsset?.recipeId ?? `slogan-${optionIndex + 1}`,
            sourceMasks,
            settings,
          }),
          reviewState: 'approved',
        });

        appendFiles([managedFile]);
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
    [addActivity, appendFiles, filesRef, project],
  );

  const generateMaskSheets = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Approve at least one color mask first.');
        return;
      }

      try {
        context?.setProgress('Creating mask sheet image...');
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const files = await createMaskSheetFiles({ project, sourceMasks, settings });
        const reservedNames = getReservedNames(filesRef.current);
        const managedFiles: ManagedFile[] = [];

        for (const [index, file] of files.entries()) {
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          managedFiles.push(
            await createGeneratedMarketingFile({
              file: uniqueFile,
              project,
              assetVariant: 'marketing-mask-sheet',
              metadata: createMarketingAssetMetadata({
                type: 'mask-sheet',
                stage: 'final',
                optionIndex: index,
                recipeId: 'mask-sheet-grid',
                sourceMasks,
                settings,
              }),
              reviewState: 'approved',
            }),
          );
        }

        appendFiles(managedFiles);
        addActivity(
          'marketing-generated',
          'success',
          `Generated ${managedFiles.length} mask sheet image${managedFiles.length === 1 ? '' : 's'}.`,
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
    [addActivity, appendFiles, filesRef, project],
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
        const managedFiles: ManagedFile[] = [];

        for (const [optionIndex, recipe] of CHILDREN_SCENE_RECIPES.entries()) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          context?.setProgress(`Generating children scene preview ${optionIndex + 1}/3...`);
          const backgroundFile = await generateMarketingSceneFile(
            settings,
            project,
            sourceMasks,
            {
              id: recipe.id,
              optionIndex,
              stage: 'preview',
              maskCount: Math.min(sourceMasks.length, recipe.positions.length),
            },
            context?.signal,
          );
          const file = await composeChildrenSceneFile({
            project,
            backgroundFile,
            sourceMasks,
            optionIndex,
            stage: 'preview',
            settings,
          });
          const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
          managedFiles.push(
            await createGeneratedMarketingFile({
              file: uniqueFile,
              project,
              assetVariant: 'marketing-children-scene',
              metadata: createMarketingAssetMetadata({
                type: 'children-scene',
                stage: 'preview',
                optionIndex,
                recipeId: recipe.id,
                sourceMasks,
                settings,
              }),
              reviewState: 'pending',
            }),
          );
        }

        appendFiles(managedFiles);
        addActivity('marketing-generated', 'success', 'Generated 3 children scene previews.');
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
    [addActivity, appendFiles, filesRef, generateMarketingSceneFile, project],
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
        context?.setProgress('Generating final children scene...');
        const settings = normalizeMarketingImageSettings(project.marketingSettings.final);
        const backgroundFile = await generateMarketingSceneFile(
          settings,
          project,
          sourceMasks,
          {
            id: recipe.id,
            optionIndex,
            stage: 'final',
            maskCount: Math.min(sourceMasks.length, recipe.positions.length),
          },
          context?.signal,
        );
        const file = await composeChildrenSceneFile({
          project,
          backgroundFile,
          sourceMasks,
          optionIndex,
          stage: 'final',
          settings,
        });
        const uniqueFile = makeUniqueFileWithReservedNames(
          file,
          getReservedNames(filesRef.current),
        );
        const managedFile = await createGeneratedMarketingFile({
          file: uniqueFile,
          project,
          assetVariant: 'marketing-children-scene',
          metadata: createMarketingAssetMetadata({
            type: 'children-scene',
            stage: 'final',
            optionIndex,
            recipeId: recipe.id,
            sourceMasks,
            settings,
          }),
          reviewState: 'approved',
        });

        appendFiles([managedFile]);
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
    [addActivity, appendFiles, filesRef, generateMarketingSceneFile, project],
  );

  return {
    generateSloganPreviews,
    finalizeSloganPoster,
    generateMaskSheets,
    generateChildrenScenePreviews,
    finalizeChildrenScene,
  };
};
