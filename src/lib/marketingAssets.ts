import { DEFAULT_MARKETING_PREVIEW_IMAGE_SETTINGS } from '../constants';
import { groupFilesForExport, isImageFile } from './files';

import type {
  FileAssetVariant,
  ManagedFile,
  MarketingAssetMetadata,
  MarketingAssetStage,
  MarketingAssetType,
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

export const MASK_SHEET_PAGE_SIZE = 16;

export const getMaskSheetPageCount = (maskCount: number): number =>
  Math.ceil(Math.max(maskCount, 0) / MASK_SHEET_PAGE_SIZE);

export const normalizeMarketingImageSettings = (
  settings: OpenAIImageSettings | MarketingImageSettings,
): MarketingImageSettings => ({
  ...settings,
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
  sourceMasks,
  settings,
}: {
  type: MarketingAssetType;
  stage: MarketingAssetStage;
  optionIndex?: number;
  recipeId: string;
  sourceMasks: ManagedFile[];
  settings: MarketingImageSettings;
}): MarketingAssetMetadata => ({
  type,
  stage,
  ...(optionIndex !== undefined ? { optionIndex } : {}),
  recipeId,
  sourceFileIds: sourceMasks.map((file) => file.id),
  generatedFromSettings: normalizeMarketingImageSettings(settings),
  generatedAt: new Date().toISOString(),
});

export const getChildrenSceneRecipe = (optionIndex: number): ChildrenSceneRecipe =>
  CHILDREN_SCENE_RECIPES[optionIndex] ?? DEFAULT_CHILDREN_SCENE_RECIPE;

export const sanitizeMarketingSettings = (settings: MarketingSettings): MarketingSettings => ({
  ...settings,
  preview: {
    ...settings.preview,
    customSettings: normalizeMarketingImageSettings(settings.preview.customSettings),
  },
  final: normalizeMarketingImageSettings(settings.final),
  childrenSceneSubjectIds: settings.childrenSceneSubjectIds.slice(0, 3),
});
