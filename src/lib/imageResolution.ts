import { loadImageElement } from './imageMetadata';

import type { FinalImageResolution, OpenAIImageBackground } from '../types';

export type FinalImageResolutionOption = {
  value: FinalImageResolution;
  label: string;
};

export const finalImageResolutionOptions: FinalImageResolutionOption[] = [
  { value: 'native', label: 'Native OpenAI output' },
  { value: '1024x1024', label: '1024 x 1024 square' },
  { value: '1536x1024', label: '1536 x 1024 landscape 3:2' },
  { value: '1024x1536', label: '1024 x 1536 portrait 2:3' },
  { value: '1920x1920', label: '1920 x 1920 square' },
  { value: '1920x1080', label: '1920 x 1080 landscape 16:9' },
  { value: '1080x1920', label: '1080 x 1920 portrait 9:16' },
  { value: '2048x2048', label: '2048 x 2048 square' },
  { value: '2048x1536', label: '2048 x 1536 landscape 4:3' },
  { value: '1536x2048', label: '1536 x 2048 portrait 3:4' },
  { value: '2048x1365', label: '2048 x 1365 landscape 3:2' },
  { value: '1365x2048', label: '1365 x 2048 portrait 2:3' },
  { value: '2560x2560', label: '2560 x 2560 square' },
  { value: '2560x1440', label: '2560 x 1440 landscape 16:9' },
  { value: '1440x2560', label: '1440 x 2560 portrait 9:16' },
  { value: '3072x3072', label: '3072 x 3072 square' },
  { value: '3072x2304', label: '3072 x 2304 landscape 4:3' },
  { value: '2304x3072', label: '2304 x 3072 portrait 3:4' },
  { value: '3072x2048', label: '3072 x 2048 landscape 3:2' },
  { value: '2048x3072', label: '2048 x 3072 portrait 2:3' },
  { value: '3840x2160', label: '3840 x 2160 4K landscape 16:9' },
  { value: '2160x3840', label: '2160 x 3840 4K portrait 9:16' },
  { value: '3840x2880', label: '3840 x 2880 4K landscape 4:3' },
  { value: '2880x3840', label: '2880 x 3840 4K portrait 3:4' },
  { value: '3840x2560', label: '3840 x 2560 4K landscape 3:2' },
  { value: '2560x3840', label: '2560 x 3840 4K portrait 2:3' },
  { value: '4096x4096', label: '4096 x 4096 4K square' },
  { value: '4096x3072', label: '4096 x 3072 4K landscape 4:3' },
  { value: '3072x4096', label: '3072 x 4096 4K portrait 3:4' },
  { value: '4096x2736', label: '4096 x 2736 4K landscape 3:2' },
  { value: '2736x4096', label: '2736 x 4096 4K portrait 2:3' },
  { value: '4096x2304', label: '4096 x 2304 4K landscape 16:9' },
  { value: '2304x4096', label: '2304 x 4096 4K portrait 9:16' },
];

export const finalImageResolutionValues = finalImageResolutionOptions.map((option) => option.value);

export const parseFinalImageResolution = (
  resolution: FinalImageResolution,
): { width: number; height: number } | null => {
  if (resolution === 'native') {
    return null;
  }

  const [width, height] = resolution.split('x').map(Number);
  if (!width || !height) {
    return null;
  }

  return { width, height };
};

export const resizeImageFileToFinalResolution = async (
  file: File,
  resolution: FinalImageResolution,
  background: OpenAIImageBackground,
): Promise<File> => {
  const target = parseFinalImageResolution(resolution);
  if (!target) {
    return file;
  }

  const image = await loadImageElement(file);
  if (image.naturalWidth === target.width && image.naturalHeight === target.height) {
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare resized image canvas.');
  }

  const canKeepAlpha =
    background === 'transparent' && (file.type === 'image/png' || file.type === 'image/webp');
  if (!canKeepAlpha) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, target.width, target.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const scale = Math.min(target.width / image.naturalWidth, target.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = (target.width - drawWidth) / 2;
  const drawY = (target.height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
        return;
      }

      reject(new Error('Could not create resized image.'));
    }, file.type || 'image/png');
  });

  return new File([blob], file.name, {
    type: blob.type || file.type || 'image/png',
    lastModified: Date.now(),
  });
};
