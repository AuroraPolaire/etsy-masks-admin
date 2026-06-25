import { useCallback } from 'react';

import { makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import { createManagedFile } from '../lib/files';
import {
  createMarketingAssetMetadata,
  getApprovedMarketingSourceMasks,
  getChildrenSceneRecipe,
  getMarketingAssetFiles,
  getMaskSheetPageSlices,
  getSelectedChildrenSceneMasks,
  getSelectedFlatLaySceneMasks,
  getSelectedPrinterSceneMask,
  resolveMarketingPreviewSettings,
} from '../lib/marketingAssets';
import { createScriptedMaskSheetFile } from '../lib/scriptedMaskSheet';

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
    reviewNotes: 'Marketing asset generated from ready masks.',
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

  if (type === 'printer-scene') {
    return 'marketing-printer-scene';
  }

  if (type === 'flat-lay-scene') {
    return 'marketing-flat-lay-scene';
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
      try {
        const settings = resolveMarketingPreviewSettings(project);
        const reservedNames = getReservedNames(filesRef.current);
        const optionIndex = getExistingAssetCount(filesRef.current, 'slogan-poster');
        const customPrompt = getAdditionalPrompt(project);

        if (context?.signal.aborted) {
          throw new DOMException('Marketing generation cancelled', 'AbortError');
        }

        const recipe: MarketingGenerationRecipe = {
          type: 'slogan-poster',
          id: `slogan-${optionIndex + 1}`,
          optionIndex,
          stage: 'final',
          maskCount: 0,
          ...(customPrompt ? { customPrompt } : {}),
        };

        context?.setProgress('Generating AI slogan variation...');
        const file = await generateMarketingSceneFile(
          settings,
          project,
          [],
          recipe,
          context?.signal,
        );
        const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
        const managedFile = await createAiMarketingFile({
          file: uniqueFile,
          project,
          type: 'slogan-poster',
          recipe,
          sourceMasks: [],
          settings,
          reviewState: 'approved',
        });
        appendVisibleMarketingFile(managedFile);

        addActivity('marketing-generated', 'success', 'Generated slogan poster.');
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
        addActivity('marketing-generated', 'warning', 'Generate at least one color mask first.');
        return;
      }

      try {
        const settings = resolveMarketingPreviewSettings(project);
        const maskSheetPages = getMaskSheetPageSlices(
          sourceMasks,
          project.marketingSettings.maskSheetMasksPerImage,
        );
        const pageCount = maskSheetPages.length;
        const reservedNames = getReservedNames(filesRef.current);
        const optionStart = getExistingAssetCount(filesRef.current, 'mask-sheet');
        let generatedCount = 0;

        for (const [pageIndex, pageMasks] of maskSheetPages.entries()) {
          if (context?.signal.aborted) {
            throw new DOMException('Marketing generation cancelled', 'AbortError');
          }

          const recipe: MarketingGenerationRecipe = {
            type: 'mask-sheet',
            id: `mask-sheet-${optionStart + pageIndex + 1}`,
            optionIndex: optionStart + pageIndex,
            stage: 'final',
            maskCount: pageMasks.length,
            pageIndex,
            pageCount,
          };

          context?.setProgress(`Creating mask sheet ${pageIndex + 1}/${pageCount}...`);
          const file = await createScriptedMaskSheetFile({
            settings,
            recipe,
            sourceMasks: pageMasks,
          });
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
    [addActivity, appendVisibleMarketingFile, filesRef, project],
  );

  const generateChildrenScenePreviews = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getSelectedChildrenSceneMasks(
        project,
        getApprovedMarketingSourceMasks(project, filesRef.current),
      );
      if (sourceMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Generate at least one color mask first.');
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

  const generatePrinterScenePreviews = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      const selectedMask = getSelectedPrinterSceneMask(project, sourceMasks);
      if (!selectedMask) {
        addActivity('marketing-generated', 'warning', 'Generate at least one color mask first.');
        return;
      }

      try {
        const settings: MarketingImageSettings = {
          model: 'gpt-image-2',
          size: '1024x1024',
          quality: 'low',
          background: 'opaque',
          outputFormat: 'png',
          coloringPageSize: '1024x1024',
        };
        const reservedNames = getReservedNames(filesRef.current);
        const optionIndex = getExistingAssetCount(filesRef.current, 'printer-scene');

        if (context?.signal.aborted) {
          throw new DOMException('Marketing generation cancelled', 'AbortError');
        }

        const recipe: MarketingGenerationRecipe = {
          type: 'printer-scene',
          id: `printer-scene-${optionIndex + 1}`,
          optionIndex,
          stage: 'final',
          maskCount: 1,
        };

        context?.setProgress('Generating AI printer scene...');
        const file = await generateMarketingSceneFile(
          settings,
          project,
          [selectedMask],
          recipe,
          context?.signal,
        );
        const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
        const managedFile = await createAiMarketingFile({
          file: uniqueFile,
          project,
          type: 'printer-scene',
          recipe,
          sourceMasks: [selectedMask],
          settings,
          reviewState: 'approved',
        });
        appendVisibleMarketingFile(managedFile);

        addActivity('marketing-generated', 'success', 'Generated printer scene image.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate printer scene image.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  const generateFlatLayScenePreviews = useCallback(
    async (context?: BusyActionContext) => {
      const sourceMasks = getApprovedMarketingSourceMasks(project, filesRef.current);
      const selectedMasks = getSelectedFlatLaySceneMasks(project, sourceMasks);
      if (selectedMasks.length === 0) {
        addActivity('marketing-generated', 'warning', 'Generate at least one color mask first.');
        return;
      }

      try {
        const settings: MarketingImageSettings = {
          model: 'gpt-image-2',
          size: '1024x1024',
          quality: 'low',
          background: 'opaque',
          outputFormat: 'png',
          coloringPageSize: '1024x1024',
        };
        const reservedNames = getReservedNames(filesRef.current);
        const optionIndex = getExistingAssetCount(filesRef.current, 'flat-lay-scene');

        if (context?.signal.aborted) {
          throw new DOMException('Marketing generation cancelled', 'AbortError');
        }

        const orientationInfo = selectedMasks
          .map((file, i) => {
            const { width = 0, height = 0 } = file.imageMetadata ?? {};
            const orientation =
              width > height
                ? 'landscape — print horizontally'
                : width < height
                  ? 'portrait — print vertically'
                  : 'square';
            return `Mask ${i + 1}: ${orientation}`;
          })
          .join('. ');

        const recipe: MarketingGenerationRecipe = {
          type: 'flat-lay-scene',
          id: `flat-lay-scene-${optionIndex + 1}`,
          optionIndex,
          stage: 'final',
          maskCount: selectedMasks.length,
          customPrompt: orientationInfo,
        };

        context?.setProgress('Generating AI flat-lay scene...');
        const file = await generateMarketingSceneFile(
          settings,
          project,
          selectedMasks,
          recipe,
          context?.signal,
        );
        const uniqueFile = makeUniqueFileWithReservedNames(file, reservedNames);
        const managedFile = await createAiMarketingFile({
          file: uniqueFile,
          project,
          type: 'flat-lay-scene',
          recipe,
          sourceMasks: selectedMasks,
          settings,
          reviewState: 'approved',
        });
        appendVisibleMarketingFile(managedFile);

        addActivity('marketing-generated', 'success', 'Generated flat-lay scene image.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('marketing-generated', 'warning', 'Marketing generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate flat-lay scene image.',
        );
      }
    },
    [addActivity, appendVisibleMarketingFile, filesRef, generateMarketingSceneFile, project],
  );

  return {
    generateSloganPreviews,
    generateMaskSheets,
    generateChildrenScenePreviews,
    generatePrinterScenePreviews,
    generateFlatLayScenePreviews,
  };
};
