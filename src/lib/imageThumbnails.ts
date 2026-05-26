import { isImageFile } from './files';
import { loadImageElement } from './imageMetadata';

const THUMBNAIL_MAX_EDGE_PX = 384;
const THUMBNAIL_QUALITY = 0.82;

export const createImageThumbnailBlob = async (file: File): Promise<Blob | null> => {
  if (!isImageFile(file)) {
    return null;
  }

  try {
    const image = await loadImageElement(file);
    const scale = Math.min(
      THUMBNAIL_MAX_EDGE_PX / image.naturalWidth,
      THUMBNAIL_MAX_EDGE_PX / image.naturalHeight,
      1,
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', THUMBNAIL_QUALITY);
    });
  } catch {
    return null;
  }
};
