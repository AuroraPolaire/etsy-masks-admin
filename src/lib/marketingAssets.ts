import {
  DEFAULT_MARKETING_PREVIEW_IMAGE_SETTINGS,
  DEFAULT_MASK_SHEET_MASKS_PER_IMAGE,
  MAX_MASK_SHEET_MASKS_PER_IMAGE,
  MIN_MASK_SHEET_MASKS_PER_IMAGE,
} from '../constants';
import { groupFilesForExport, isImageFile } from './files';

import type {
  FileAssetVariant,
  ManagedFile,
  MarketingAssetMetadata,
  MarketingAssetStage,
  MarketingAssetType,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  MarketingSettings,
  OpenAIImageSettings,
  Project,
} from '../types';

type ChildrenSceneRecipe = {
  id: string;
  label: string;
};

const MARKETING_ASSET_VARIANTS: FileAssetVariant[] = [
  'marketing-slogan',
  'marketing-mask-sheet',
  'marketing-children-scene',
  'marketing-printer-scene',
];

export const CHILDREN_SCENE_RECIPES: ChildrenSceneRecipe[] = [
  {
    id: 'party-table',
    label: 'Party table',
  },
  {
    id: 'classroom-craft',
    label: 'Classroom craft',
  },
  {
    id: 'play-corner',
    label: 'Play corner',
  },
];
const DEFAULT_CHILDREN_SCENE_RECIPE = CHILDREN_SCENE_RECIPES[0]!;

export const normalizeMaskSheetMasksPerImage = (
  value: number,
  fallback = DEFAULT_MASK_SHEET_MASKS_PER_IMAGE,
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    MAX_MASK_SHEET_MASKS_PER_IMAGE,
    Math.max(MIN_MASK_SHEET_MASKS_PER_IMAGE, Math.round(value)),
  );
};

export const getMaskSheetPageCount = (
  maskCount: number,
  masksPerImage = DEFAULT_MASK_SHEET_MASKS_PER_IMAGE,
): number => Math.ceil(Math.max(maskCount, 0) / normalizeMaskSheetMasksPerImage(masksPerImage));

export const getMaskSheetPageSlices = <Item>(
  items: Item[],
  masksPerImage = DEFAULT_MASK_SHEET_MASKS_PER_IMAGE,
): Item[][] => {
  const pageSize = normalizeMaskSheetMasksPerImage(masksPerImage);
  const pageCount = getMaskSheetPageCount(items.length, pageSize);
  if (pageCount === 0) {
    return [];
  }

  return Array.from({ length: pageCount }, (_, pageIndex) =>
    items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
  ).filter((pageItems) => pageItems.length > 0);
};

export const normalizeMarketingImageSettings = (
  settings: OpenAIImageSettings | MarketingImageSettings,
): MarketingImageSettings => ({
  ...settings,
  size: settings.size === '512x512' ? '1024x1024' : settings.size,
  quality: settings.quality === 'high' ? 'medium' : settings.quality,
});

export const resolveMarketingPreviewSettings = (project: Project): MarketingImageSettings =>
  project.marketingSettings.preview.mode === 'custom'
    ? normalizeMarketingImageSettings(project.marketingSettings.preview.customSettings)
    : {
        ...normalizeMarketingImageSettings(project.openAIImageSettings),
        size: DEFAULT_MARKETING_PREVIEW_IMAGE_SETTINGS.size,
      };

export const getApprovedMarketingSourceMasks = (
  project: Project,
  files: ManagedFile[],
): ManagedFile[] => {
  const groups = groupFilesForExport(files, project.subjects);
  const approvedBySubjectId = new Map(
    groups.approvedMapped
      .filter((file) => file.mappedSubjectId)
      .map((file) => [file.mappedSubjectId!, file]),
  );

  return project.subjects
    .map((subject) => approvedBySubjectId.get(subject.id))
    .filter((file): file is ManagedFile => Boolean(file));
};

export const getSelectedChildrenSceneMasks = (
  project: Project,
  sourceMasks: ManagedFile[],
): ManagedFile[] => {
  const selectedIds = project.marketingSettings.childrenSceneSubjectIds;
  const selectedMasks = selectedIds
    .map((subjectId) => sourceMasks.find((file) => file.mappedSubjectId === subjectId))
    .filter((file): file is ManagedFile => Boolean(file));

  return (selectedMasks.length > 0 ? selectedMasks : sourceMasks).slice(0, 3);
};

export const isMarketingAssetFile = (file: ManagedFile): boolean =>
  MARKETING_ASSET_VARIANTS.includes(file.assetVariant);

export const getMarketingAssetFiles = (
  files: ManagedFile[],
  type?: MarketingAssetType,
  stage?: MarketingAssetStage,
): ManagedFile[] =>
  files.filter(
    (file) =>
      isMarketingAssetFile(file) &&
      (!type || file.marketingAsset?.type === type) &&
      (!stage || file.marketingAsset?.stage === stage),
  );

export const getFinalMarketingAssetFiles = (files: ManagedFile[]): ManagedFile[] =>
  getMarketingAssetFiles(files, undefined, 'final').filter(
    (file) => file.reviewState === 'approved' && isImageFile(file),
  );

const haveSameValues = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const haveSameMarketingImageSettings = (
  left: MarketingImageSettings,
  right: MarketingImageSettings,
): boolean => {
  const normalizedLeft = normalizeMarketingImageSettings(left);
  const normalizedRight = normalizeMarketingImageSettings(right);

  return (
    normalizedLeft.model === normalizedRight.model &&
    normalizedLeft.size === normalizedRight.size &&
    normalizedLeft.quality === normalizedRight.quality &&
    normalizedLeft.background === normalizedRight.background &&
    normalizedLeft.outputFormat === normalizedRight.outputFormat
  );
};

export const findReusableFinalMarketingAsset = ({
  files,
  type,
  recipe,
  sourceMasks,
  settings,
}: {
  files: ManagedFile[];
  type: MarketingAssetType;
  recipe: MarketingGenerationRecipe;
  sourceMasks: ManagedFile[];
  settings: MarketingImageSettings;
}): ManagedFile | undefined => {
  const sourceFileIds = sourceMasks.map((file) => file.id);

  return files.find((file) => {
    const metadata = file.marketingAsset;

    return (
      file.reviewState === 'approved' &&
      isImageFile(file) &&
      isMarketingAssetFile(file) &&
      metadata?.type === type &&
      metadata.stage === 'final' &&
      metadata.recipeId === recipe.id &&
      metadata.optionIndex === recipe.optionIndex &&
      (metadata.customPrompt ?? '') === (recipe.customPrompt ?? '') &&
      haveSameValues(metadata.sourceFileIds, sourceFileIds) &&
      haveSameMarketingImageSettings(metadata.generatedFromSettings, settings)
    );
  });
};

export const isMarketingAssetStale = (
  file: ManagedFile,
  currentSourceMasks: ManagedFile[],
): boolean => {
  const sourceFileIds = file.marketingAsset?.sourceFileIds ?? [];
  if (sourceFileIds.length === 0) {
    return false;
  }

  const currentIds = new Set(currentSourceMasks.map((sourceFile) => sourceFile.id));
  return sourceFileIds.some((sourceFileId) => !currentIds.has(sourceFileId));
};

export const createMarketingAssetMetadata = ({
  type,
  stage,
  optionIndex,
  recipeId,
  customPrompt,
  sourceMasks,
  settings,
}: {
  type: MarketingAssetType;
  stage: MarketingAssetStage;
  optionIndex?: number;
  recipeId: string;
  customPrompt?: string;
  sourceMasks: ManagedFile[];
  settings: MarketingImageSettings;
}): MarketingAssetMetadata => ({
  type,
  stage,
  ...(optionIndex !== undefined ? { optionIndex } : {}),
  recipeId,
  ...(customPrompt ? { customPrompt } : {}),
  sourceFileIds: sourceMasks.map((file) => file.id),
  generatedFromSettings: normalizeMarketingImageSettings(settings),
  generatedAt: new Date().toISOString(),
});

export const getChildrenSceneRecipe = (optionIndex: number): ChildrenSceneRecipe =>
  CHILDREN_SCENE_RECIPES[optionIndex % CHILDREN_SCENE_RECIPES.length] ??
  DEFAULT_CHILDREN_SCENE_RECIPE;

export const getSelectedPrinterSceneMask = (
  project: Project,
  sourceMasks: ManagedFile[],
): ManagedFile | undefined => {
  if (project.marketingSettings.printerSceneSubjectId) {
    const found = sourceMasks.find(
      (file) => file.mappedSubjectId === project.marketingSettings.printerSceneSubjectId,
    );
    if (found) return found;
  }
  return sourceMasks[0];
};

export const sanitizeMarketingSettings = (settings: MarketingSettings): MarketingSettings => ({
  ...settings,
  additionalPrompt: (settings.additionalPrompt ?? '').trimStart(),
  maskSheetMasksPerImage: normalizeMaskSheetMasksPerImage(settings.maskSheetMasksPerImage),
  preview: {
    ...settings.preview,
    customSettings: normalizeMarketingImageSettings(settings.preview.customSettings),
  },
  childrenSceneSubjectIds: settings.childrenSceneSubjectIds.slice(0, 3),
});
