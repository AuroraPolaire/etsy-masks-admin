import { groupFilesForExport, isImageFile } from './files';
import { loadImageElement } from './imageMetadata';
import { slugify } from './slugify';

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

type CanvasDimensions = {
  width: number;
  height: number;
};

type ChildrenSceneRecipe = {
  id: string;
  label: string;
  positions: Array<{ x: number; y: number; width: number }>;
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
    positions: [
      { x: 0.32, y: 0.45, width: 0.2 },
      { x: 0.5, y: 0.42, width: 0.21 },
      { x: 0.68, y: 0.46, width: 0.2 },
    ],
  },
  {
    id: 'classroom-craft',
    label: 'Classroom craft',
    positions: [
      { x: 0.38, y: 0.42, width: 0.22 },
      { x: 0.62, y: 0.43, width: 0.22 },
    ],
  },
  {
    id: 'play-corner',
    label: 'Play corner',
    positions: [
      { x: 0.27, y: 0.48, width: 0.19 },
      { x: 0.5, y: 0.42, width: 0.22 },
      { x: 0.73, y: 0.48, width: 0.19 },
    ],
  },
];
const DEFAULT_CHILDREN_SCENE_RECIPE = CHILDREN_SCENE_RECIPES[0]!;

const PREVIEW_FALLBACK_DIMENSIONS: CanvasDimensions = { width: 1024, height: 1024 };
const FINAL_FALLBACK_DIMENSIONS: CanvasDimensions = { width: 2048, height: 2048 };
const MASK_SHEET_PAGE_SIZE = 16;

export const getMaskSheetPageCount = (maskCount: number): number =>
  Math.ceil(Math.max(maskCount, 0) / MASK_SHEET_PAGE_SIZE);

const getCanvas = (dimensions: CanvasDimensions): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  return canvas;
};

const getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is unavailable.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return context;
};

const canvasToPngFile = (canvas: HTMLCanvasElement, fileName: string): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Could not create ${fileName}.`));
        return;
      }

      resolve(new File([blob], fileName, { type: 'image/png' }));
    }, 'image/png');
  });

const parseImageSize = (
  size: MarketingImageSettings['size'],
  fallback: CanvasDimensions,
): CanvasDimensions => {
  if (size === 'auto') {
    return fallback;
  }

  const [rawWidth, rawHeight] = size.split('x');
  const width = Number(rawWidth);
  const height = Number(rawHeight);

  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : fallback;
};

export const normalizeMarketingImageSettings = (
  settings: OpenAIImageSettings | MarketingImageSettings,
): MarketingImageSettings => ({
  ...settings,
  quality: settings.quality === 'high' ? 'medium' : settings.quality,
});

export const resolveMarketingPreviewSettings = (project: Project): MarketingImageSettings =>
  project.marketingSettings.preview.mode === 'custom'
    ? normalizeMarketingImageSettings(project.marketingSettings.preview.customSettings)
    : normalizeMarketingImageSettings(project.openAIImageSettings);

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

const getSlogan = (project: Project): string =>
  project.marketingSettings.slogan.trim() ||
  project.settings.title.trim() ||
  `${project.settings.theme || 'Printable masks'} for kids`;

const loadMaskImages = async (masks: ManagedFile[]) =>
  Promise.all(masks.map(async (mask) => ({ mask, image: await loadImageElement(mask.file) })));

const fillBackground = (
  context: CanvasRenderingContext2D,
  dimensions: CanvasDimensions,
  color: string,
) => {
  context.fillStyle = color;
  context.fillRect(0, 0, dimensions.width, dimensions.height);
};

const drawContainedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
) => {
  const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = box.x + (box.width - width) / 2;
  const y = box.y + (box.height - height) / 2;

  context.drawImage(image, x, y, width, height);
};

const drawCoverImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dimensions: CanvasDimensions,
) => {
  const scale = Math.max(
    dimensions.width / image.naturalWidth,
    dimensions.height / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (dimensions.width - width) / 2;
  const y = (dimensions.height - height) / 2;

  context.drawImage(image, x, y, width, height);
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth || !line) {
      line = nextLine;
      continue;
    }

    lines.push(line);
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines;
};

const fitTextLines = ({
  context,
  text,
  maxWidth,
  maxLines,
  maxFontSize,
  minFontSize,
  weight,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  weight: number;
}) => {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 2) {
    context.font = `${weight} ${fontSize}px Arial, sans-serif`;
    const lines = wrapText(context, text, maxWidth);
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  context.font = `${weight} ${minFontSize}px Arial, sans-serif`;
  const lines = wrapText(context, text, maxWidth);
  return {
    fontSize: minFontSize,
    lines: lines.slice(0, maxLines),
  };
};

const drawCenteredText = ({
  context,
  text,
  centerX,
  y,
  maxWidth,
  maxLines,
  maxFontSize,
  minFontSize,
  weight,
  color,
  lineHeightMultiplier = 1.12,
}: {
  context: CanvasRenderingContext2D;
  text: string;
  centerX: number;
  y: number;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  weight: number;
  color: string;
  lineHeightMultiplier?: number;
}) => {
  const { fontSize, lines } = fitTextLines({
    context,
    text,
    maxWidth,
    maxLines,
    maxFontSize,
    minFontSize,
    weight,
  });

  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = `${weight} ${fontSize}px Arial, sans-serif`;
  lines.forEach((line, index) => {
    context.fillText(line, centerX, y + index * fontSize * lineHeightMultiplier);
  });
};

const drawMaskGrid = async ({
  context,
  masks,
  x,
  y,
  width,
  height,
  columns,
}: {
  context: CanvasRenderingContext2D;
  masks: ManagedFile[];
  x: number;
  y: number;
  width: number;
  height: number;
  columns: number;
}) => {
  const loadedMasks = await loadMaskImages(masks);
  const rows = Math.ceil(loadedMasks.length / columns);
  const gap = Math.max(width, height) * 0.025;
  const cellWidth = (width - gap * (columns - 1)) / columns;
  const cellHeight = (height - gap * Math.max(rows - 1, 0)) / rows;

  loadedMasks.forEach(({ image }, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawContainedImage(context, image, {
      x: x + column * (cellWidth + gap),
      y: y + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    });
  });
};

export const createSloganPosterFile = async ({
  project,
  sourceMasks,
  optionIndex,
  stage,
  settings,
}: {
  project: Project;
  sourceMasks: ManagedFile[];
  optionIndex: number;
  stage: MarketingAssetStage;
  settings: MarketingImageSettings;
}): Promise<File> => {
  const dimensions = parseImageSize(
    settings.size,
    stage === 'preview' ? PREVIEW_FALLBACK_DIMENSIONS : FINAL_FALLBACK_DIMENSIONS,
  );
  const canvas = getCanvas(dimensions);
  const context = getContext(canvas);
  const slogan = getSlogan(project);
  const masks = sourceMasks.slice(0, optionIndex === 1 ? 6 : 8);

  if (optionIndex === 1) {
    fillBackground(context, dimensions, '#f8efe6');
    context.fillStyle = '#235a64';
    context.fillRect(0, 0, dimensions.width * 0.38, dimensions.height);
    drawCenteredText({
      context,
      text: slogan,
      centerX: dimensions.width * 0.19,
      y: dimensions.height * 0.18,
      maxWidth: dimensions.width * 0.29,
      maxLines: 5,
      maxFontSize: dimensions.width * 0.07,
      minFontSize: dimensions.width * 0.032,
      weight: 800,
      color: '#ffffff',
    });
    drawCenteredText({
      context,
      text: `${project.subjects.length} printable masks`,
      centerX: dimensions.width * 0.19,
      y: dimensions.height * 0.7,
      maxWidth: dimensions.width * 0.28,
      maxLines: 2,
      maxFontSize: dimensions.width * 0.032,
      minFontSize: dimensions.width * 0.02,
      weight: 700,
      color: '#f8efe6',
    });
    await drawMaskGrid({
      context,
      masks,
      x: dimensions.width * 0.44,
      y: dimensions.height * 0.1,
      width: dimensions.width * 0.48,
      height: dimensions.height * 0.8,
      columns: 2,
    });
  } else if (optionIndex === 2) {
    fillBackground(context, dimensions, '#fbfaf7');
    context.strokeStyle = '#d65f36';
    context.lineWidth = dimensions.width * 0.018;
    context.strokeRect(
      dimensions.width * 0.06,
      dimensions.height * 0.06,
      dimensions.width * 0.88,
      dimensions.height * 0.88,
    );
    await drawMaskGrid({
      context,
      masks,
      x: dimensions.width * 0.1,
      y: dimensions.height * 0.11,
      width: dimensions.width * 0.8,
      height: dimensions.height * 0.48,
      columns: 4,
    });
    drawCenteredText({
      context,
      text: slogan,
      centerX: dimensions.width * 0.5,
      y: dimensions.height * 0.64,
      maxWidth: dimensions.width * 0.72,
      maxLines: 3,
      maxFontSize: dimensions.width * 0.075,
      minFontSize: dimensions.width * 0.034,
      weight: 900,
      color: '#31313a',
    });
  } else {
    fillBackground(context, dimensions, '#fff7ed');
    drawCenteredText({
      context,
      text: project.settings.theme || 'Printable masks',
      centerX: dimensions.width * 0.5,
      y: dimensions.height * 0.07,
      maxWidth: dimensions.width * 0.76,
      maxLines: 2,
      maxFontSize: dimensions.width * 0.052,
      minFontSize: dimensions.width * 0.026,
      weight: 800,
      color: '#235a64',
    });
    drawCenteredText({
      context,
      text: slogan,
      centerX: dimensions.width * 0.5,
      y: dimensions.height * 0.2,
      maxWidth: dimensions.width * 0.78,
      maxLines: 3,
      maxFontSize: dimensions.width * 0.075,
      minFontSize: dimensions.width * 0.034,
      weight: 900,
      color: '#8b3324',
    });
    await drawMaskGrid({
      context,
      masks,
      x: dimensions.width * 0.11,
      y: dimensions.height * 0.48,
      width: dimensions.width * 0.78,
      height: dimensions.height * 0.42,
      columns: 4,
    });
  }

  const suffix = stage === 'preview' ? `preview-${optionIndex + 1}` : `final-${optionIndex + 1}`;
  return canvasToPngFile(
    canvas,
    `${slugify(project.settings.theme || 'marketing')}-slogan-${suffix}.png`,
  );
};

export const createMaskSheetFiles = async ({
  project,
  sourceMasks,
  settings,
}: {
  project: Project;
  sourceMasks: ManagedFile[];
  settings: MarketingImageSettings;
}): Promise<File[]> => {
  const dimensions = parseImageSize(settings.size, FINAL_FALLBACK_DIMENSIONS);
  const pages = getMaskSheetPageCount(sourceMasks.length);
  const files: File[] = [];

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const masks = sourceMasks.slice(
      pageIndex * MASK_SHEET_PAGE_SIZE,
      (pageIndex + 1) * MASK_SHEET_PAGE_SIZE,
    );
    const canvas = getCanvas(dimensions);
    const context = getContext(canvas);
    fillBackground(context, dimensions, '#fbfaf7');
    drawCenteredText({
      context,
      text: project.settings.theme || 'Printable masks',
      centerX: dimensions.width * 0.5,
      y: dimensions.height * 0.045,
      maxWidth: dimensions.width * 0.78,
      maxLines: 2,
      maxFontSize: dimensions.width * 0.042,
      minFontSize: dimensions.width * 0.022,
      weight: 800,
      color: '#31313a',
    });
    await drawMaskGrid({
      context,
      masks,
      x: dimensions.width * 0.07,
      y: dimensions.height * 0.16,
      width: dimensions.width * 0.86,
      height: dimensions.height * 0.76,
      columns: 4,
    });
    drawCenteredText({
      context,
      text: pages > 1 ? `Page ${pageIndex + 1} of ${pages}` : `${sourceMasks.length} masks`,
      centerX: dimensions.width * 0.5,
      y: dimensions.height * 0.93,
      maxWidth: dimensions.width * 0.4,
      maxLines: 1,
      maxFontSize: dimensions.width * 0.024,
      minFontSize: dimensions.width * 0.016,
      weight: 700,
      color: '#5f6470',
    });
    files.push(
      await canvasToPngFile(
        canvas,
        `${slugify(project.settings.theme || 'marketing')}-mask-sheet-${String(pageIndex + 1).padStart(2, '0')}.png`,
      ),
    );
  }

  return files;
};

export const composeChildrenSceneFile = async ({
  project,
  backgroundFile,
  sourceMasks,
  optionIndex,
  stage,
  settings,
}: {
  project: Project;
  backgroundFile: File;
  sourceMasks: ManagedFile[];
  optionIndex: number;
  stage: MarketingAssetStage;
  settings: MarketingImageSettings;
}): Promise<File> => {
  const recipe = CHILDREN_SCENE_RECIPES[optionIndex] ?? DEFAULT_CHILDREN_SCENE_RECIPE;
  const dimensions = parseImageSize(
    settings.size,
    stage === 'preview' ? PREVIEW_FALLBACK_DIMENSIONS : FINAL_FALLBACK_DIMENSIONS,
  );
  const canvas = getCanvas(dimensions);
  const context = getContext(canvas);
  const backgroundImage = await loadImageElement(backgroundFile);
  const masks = await loadMaskImages(sourceMasks.slice(0, recipe.positions.length));

  drawCoverImage(context, backgroundImage, dimensions);
  masks.forEach(({ image }, index) => {
    const position = recipe.positions[index];
    if (!position) {
      return;
    }

    const width = dimensions.width * position.width;
    const height = width * (image.naturalHeight / image.naturalWidth);
    const x = dimensions.width * position.x - width / 2;
    const y = dimensions.height * position.y - height / 2;
    context.drawImage(image, x, y, width, height);
  });

  const suffix = stage === 'preview' ? `preview-${optionIndex + 1}` : `final-${optionIndex + 1}`;
  return canvasToPngFile(
    canvas,
    `${slugify(project.settings.theme || 'marketing')}-children-scene-${suffix}.png`,
  );
};

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
