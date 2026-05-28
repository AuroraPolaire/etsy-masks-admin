import { fileToDataUrl } from './files';

import type { ManagedFile, MarketingGenerationRecipe, MarketingImageSettings } from '../types';

type SheetSize = {
  width: number;
  height: number;
};

type LoadedMaskImage = {
  file: ManagedFile;
  image: HTMLImageElement;
};

type CreateScriptedMaskSheetFileParams = {
  settings: MarketingImageSettings;
  sourceMasks: ManagedFile[];
  recipe: MarketingGenerationRecipe;
};

const DEFAULT_SHEET_SIZE: SheetSize = {
  width: 1024,
  height: 1024,
};

const parseSheetSize = (size: MarketingImageSettings['size']): SheetSize => {
  if (size === 'auto') {
    return DEFAULT_SHEET_SIZE;
  }

  const [width = 0, height = 0] = size.split('x').map((value) => Number(value));
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : DEFAULT_SHEET_SIZE;
};

const getOutputMimeType = (outputFormat: MarketingImageSettings['outputFormat']): string =>
  outputFormat === 'jpeg' ? 'image/jpeg' : `image/${outputFormat}`;

const getFileExtension = (outputFormat: MarketingImageSettings['outputFormat']): string =>
  outputFormat === 'jpeg' ? 'jpg' : outputFormat;

const createMaskSheetFileName = (
  recipe: MarketingGenerationRecipe,
  outputFormat: MarketingImageSettings['outputFormat'],
): string => {
  const pageSuffix =
    recipe.pageCount && recipe.pageCount > 1
      ? `-page-${String((recipe.pageIndex ?? 0) + 1).padStart(2, '0')}`
      : '';

  return `marketing-mask-sheet-final-${recipe.optionIndex + 1}${pageSuffix}.${getFileExtension(
    outputFormat,
  )}`;
};

const loadMaskImage = async (file: ManagedFile): Promise<LoadedMaskImage> => {
  const dataUrl = await fileToDataUrl(file.file);

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error(`Could not load ${file.name} for mask sheet.`));
    nextImage.src = dataUrl;
  });

  return { file, image };
};

const resolveGrid = (
  maskCount: number,
  size: SheetSize,
): {
  columns: number;
  rows: number;
} => {
  if (maskCount <= 1) {
    return { columns: 1, rows: 1 };
  }

  const aspectRatio = size.width / size.height;
  const columns = Math.ceil(Math.sqrt(maskCount * aspectRatio));
  const rows = Math.ceil(maskCount / columns);

  return {
    columns,
    rows,
  };
};

const drawContainedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
};

const drawRoundedRectangle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const nextRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
};

const canvasToFile = async (
  canvas: HTMLCanvasElement,
  fileName: string,
  outputFormat: MarketingImageSettings['outputFormat'],
): Promise<File> => {
  const mimeType = getOutputMimeType(outputFormat);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Could not create scripted mask sheet image.'));
          return;
        }

        resolve(nextBlob);
      },
      mimeType,
      outputFormat === 'jpeg' ? 0.92 : undefined,
    );
  });

  return new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
};

export const createScriptedMaskSheetFile = async ({
  settings,
  sourceMasks,
  recipe,
}: CreateScriptedMaskSheetFileParams): Promise<File> => {
  if (sourceMasks.length === 0) {
    throw new Error('At least one mask is required to create a mask sheet.');
  }

  const loadedMasks = await Promise.all(sourceMasks.map((file) => loadMaskImage(file)));
  const size = parseSheetSize(settings.size);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is unavailable.');
  }

  const transparent = settings.background === 'transparent' && settings.outputFormat !== 'jpeg';
  if (!transparent) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
  }

  const outerPadding = Math.round(Math.min(size.width, size.height) * 0.055);
  const gap = Math.round(Math.min(size.width, size.height) * 0.018);
  const gridTop = outerPadding;
  const gridHeight = size.height - outerPadding * 2;
  const { columns, rows } = resolveGrid(loadedMasks.length, size);
  const cellWidth = (size.width - outerPadding * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (gridHeight - gap * (rows - 1)) / rows;
  const inset = Math.round(Math.min(cellWidth, cellHeight) * 0.07);

  loadedMasks.forEach(({ image }, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = outerPadding + column * (cellWidth + gap);
    const y = gridTop + row * (cellHeight + gap);

    context.fillStyle = '#ffffff';
    context.strokeStyle = '#ead4cd';
    context.lineWidth = Math.max(2, Math.round(size.width * 0.0015));
    drawRoundedRectangle(
      context,
      x,
      y,
      cellWidth,
      cellHeight,
      Math.round(Math.min(cellWidth, cellHeight) * 0.04),
    );
    context.fill();
    context.stroke();

    drawContainedImage(
      context,
      image,
      x + inset,
      y + inset,
      cellWidth - inset * 2,
      cellHeight - inset * 2,
    );
  });

  return canvasToFile(
    canvas,
    createMaskSheetFileName(recipe, settings.outputFormat),
    settings.outputFormat,
  );
};
