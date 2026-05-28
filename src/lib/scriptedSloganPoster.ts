import type { MarketingGenerationRecipe, MarketingImageSettings, Project } from '../types';

type PosterSize = {
  width: number;
  height: number;
};

type CreateScriptedSloganPosterFileParams = {
  settings: MarketingImageSettings;
  project: Project;
  recipe: MarketingGenerationRecipe;
};

type PosterStyle = {
  background: string;
  accent: string;
  text: string;
  muted: string;
};

const DEFAULT_POSTER_SIZE: PosterSize = {
  width: 1024,
  height: 1024,
};

const POSTER_STYLES: PosterStyle[] = [
  {
    background: '#fff8f5',
    accent: '#6457b2',
    text: '#211b36',
    muted: '#7a6070',
  },
  {
    background: '#f5fbff',
    accent: '#267f8f',
    text: '#172c35',
    muted: '#5f6d74',
  },
  {
    background: '#fffdf0',
    accent: '#bd4f72',
    text: '#302233',
    muted: '#755f68',
  },
];

const parsePosterSize = (size: MarketingImageSettings['size']): PosterSize => {
  if (size === 'auto') {
    return DEFAULT_POSTER_SIZE;
  }

  const [width = 0, height = 0] = size.split('x').map((value) => Number(value));
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : DEFAULT_POSTER_SIZE;
};

const getOutputMimeType = (outputFormat: MarketingImageSettings['outputFormat']): string =>
  outputFormat === 'jpeg' ? 'image/jpeg' : `image/${outputFormat}`;

const getFileExtension = (outputFormat: MarketingImageSettings['outputFormat']): string =>
  outputFormat === 'jpeg' ? 'jpg' : outputFormat;

const createSloganPosterFileName = (
  recipe: MarketingGenerationRecipe,
  outputFormat: MarketingImageSettings['outputFormat'],
): string => `marketing-slogan-final-${recipe.optionIndex + 1}.${getFileExtension(outputFormat)}`;

const normalizeText = (value: string | undefined): string =>
  value?.replace(/\s+/g, ' ').trim() ?? '';

const createSloganVariations = (project: Project): string[] => {
  const explicitSlogan = normalizeText(project.marketingSettings.slogan);
  const title = normalizeText(project.settings.title);
  const theme = normalizeText(project.settings.theme) || 'Printable masks';
  const audience = normalizeText(project.settings.audience) || 'kids';
  const baseSlogan = explicitSlogan || title || `${theme} for ${audience}`;

  return [baseSlogan, `Print, cut, and play with ${theme}`, `${theme} for ${audience}`];
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth || currentLine.length === 0) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const fitText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  initialFontSize: number,
): {
  fontSize: number;
  lines: string[];
} => {
  for (let fontSize = initialFontSize; fontSize >= 28; fontSize -= 2) {
    context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    const lines = wrapText(context, text, maxWidth);
    if (lines.length <= maxLines) {
      return { fontSize, lines };
    }
  }

  context.font = '800 28px Inter, Arial, sans-serif';
  return {
    fontSize: 28,
    lines: wrapText(context, text, maxWidth).slice(0, maxLines),
  };
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
          reject(new Error('Could not create scripted slogan poster image.'));
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

export const createScriptedSloganPosterFile = async ({
  settings,
  project,
  recipe,
}: CreateScriptedSloganPosterFileParams): Promise<File> => {
  const size = parsePosterSize(settings.size);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is unavailable.');
  }

  const style = POSTER_STYLES[recipe.optionIndex % POSTER_STYLES.length] ?? POSTER_STYLES[0]!;
  const transparent = settings.background === 'transparent' && settings.outputFormat !== 'jpeg';
  if (!transparent) {
    context.fillStyle = style.background;
    context.fillRect(0, 0, size.width, size.height);
  }

  const padding = Math.round(Math.min(size.width, size.height) * 0.075);
  const maxTextWidth = size.width - padding * 2;
  const slogan =
    createSloganVariations(project)[recipe.optionIndex % 3] ??
    createSloganVariations(project)[0] ??
    'Printable masks for kids';
  const { fontSize, lines } = fitText(
    context,
    slogan,
    maxTextWidth,
    4,
    Math.round(size.width * 0.092),
  );
  const lineHeight = fontSize * 1.08;
  const textBlockHeight = lines.length * lineHeight;
  const centerY = size.height * 0.48;

  context.fillStyle = style.accent;
  context.fillRect(padding, padding, size.width - padding * 2, Math.max(8, size.height * 0.012));
  context.fillRect(
    padding,
    size.height - padding - Math.max(8, size.height * 0.012),
    size.width - padding * 2,
    Math.max(8, size.height * 0.012),
  );

  context.fillStyle = style.text;
  context.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    context.fillText(
      line,
      size.width / 2,
      centerY - textBlockHeight / 2 + lineHeight * index + lineHeight / 2,
      maxTextWidth,
    );
  });

  context.fillStyle = style.muted;
  context.font = `600 ${Math.max(18, Math.round(size.width * 0.022))}px Inter, Arial, sans-serif`;
  context.fillText('Printable digital download', size.width / 2, size.height - padding * 1.55);

  return canvasToFile(
    canvas,
    createSloganPosterFileName(recipe, settings.outputFormat),
    settings.outputFormat,
  );
};
