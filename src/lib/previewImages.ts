import { createGeneratedFile, fileToDataUrl } from './files';

import type { ManagedFile, Project } from '../types';

type CanvasContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
};

type PreviewDefinition = {
  name: string;
  draw: (canvasContext: CanvasContext) => Promise<void> | void;
};

const CANVAS_SIZE = 2000;

const createCanvasContext = (): CanvasContext => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is unavailable');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  return { canvas, context };
};

const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not create preview image'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });

const loadImage = async (file: File): Promise<HTMLImageElement> => {
  const dataUrl = await fileToDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${file.name}`));
    image.src = dataUrl;
  });
};

const drawText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
};

const drawTitle = (context: CanvasRenderingContext2D, title: string): void => {
  context.fillStyle = '#111827';
  context.font = '700 90px Arial, sans-serif';
  context.textAlign = 'center';
  drawText(context, title, CANVAS_SIZE / 2, 150, 1680, 102);
};

const drawRoundedPanel = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#d7dee5';
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(x, y, width, height, 22);
  context.fill();
  context.stroke();
};

const drawImageFit = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  const ratio = image.naturalWidth / image.naturalHeight || 1;
  let drawWidth = width;
  let drawHeight = drawWidth / ratio;

  if (drawHeight > height) {
    drawHeight = height;
    drawWidth = drawHeight * ratio;
  }

  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
};

const drawBulletList = (
  context: CanvasRenderingContext2D,
  bullets: string[],
  x: number,
  y: number,
  maxWidth: number,
): void => {
  context.fillStyle = '#243042';
  context.font = '500 54px Arial, sans-serif';
  context.textAlign = 'left';

  bullets.forEach((bullet, index) => {
    const rowY = y + index * 145;
    context.fillStyle = '#0f766e';
    context.beginPath();
    context.arc(x, rowY - 18, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#243042';
    drawText(context, bullet, x + 52, rowY, maxWidth, 64);
  });
};

const getPreviewImages = async (
  files: ManagedFile[],
  limit: number,
): Promise<HTMLImageElement[]> => {
  const selected = files.slice(0, limit);
  return Promise.all(selected.map((file) => loadImage(file.file)));
};

export const generateMarketplacePreviewImages = async (
  project: Project,
  approvedFiles: ManagedFile[],
): Promise<ManagedFile[]> => {
  const title = project.settings.title;
  const subjectNames = project.subjects.map((subject) => subject.name);

  const definitions: PreviewDefinition[] = [
    {
      name: 'hero_contact_sheet_preview.png',
      draw: async ({ context }) => {
        drawTitle(context, title);
        const images = await getPreviewImages(approvedFiles, 12);
        const columns = 4;
        const rows = Math.ceil(Math.max(images.length, 1) / columns);
        const cellSize = 350;
        const startX = (CANVAS_SIZE - columns * cellSize) / 2;
        const startY = rows > 2 ? 460 : 600;
        images.forEach((image, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          drawRoundedPanel(context, startX + column * cellSize, startY + row * cellSize, 300, 300);
          drawImageFit(
            context,
            image,
            startX + column * cellSize + 24,
            startY + row * cellSize + 24,
            252,
            252,
          );
        });
        context.fillStyle = '#0f766e';
        context.font = '700 58px Arial, sans-serif';
        context.textAlign = 'center';
        context.fillText('Digital download • A4 + US Letter', CANVAS_SIZE / 2, 1840);
      },
    },
    {
      name: 'included_files_preview.png',
      draw: ({ context }) => {
        drawTitle(context, 'What is included');
        drawBulletList(
          context,
          [
            `${approvedFiles.length} printable mask designs`,
            'Transparent PNG mask files',
            'A4 printable PDF',
            'US Letter printable PDF',
            'Printing and cutting instructions',
            'Digital download only',
          ],
          300,
          520,
          1360,
        );
      },
    },
    {
      name: 'print_cut_wear_preview.png',
      draw: ({ context }) => {
        drawTitle(context, 'Print • Cut • Wear');
        const columns = [
          ['Print', 'Print at 100%'],
          ['Cut', 'Cut around mask and eye holes'],
          ['Wear', 'Use with adult supervision'],
        ];
        columns.forEach(([heading, text], index) => {
          const x = 180 + index * 560;
          drawRoundedPanel(context, x, 660, 460, 660);
          context.fillStyle = '#0f766e';
          context.font = '700 72px Arial, sans-serif';
          context.textAlign = 'center';
          context.fillText(heading ?? '', x + 230, 845);
          context.fillStyle = '#243042';
          context.font = '500 46px Arial, sans-serif';
          drawText(context, text ?? '', x + 230, 1030, 330, 58);
        });
      },
    },
    {
      name: 'closeup_examples_preview.png',
      draw: async ({ context }) => {
        drawTitle(context, 'Close-up examples');
        const images = await getPreviewImages(approvedFiles, 6);
        images.forEach((image, index) => {
          const column = index % 3;
          const row = Math.floor(index / 3);
          const x = 245 + column * 520;
          const y = 485 + row * 545;
          drawRoundedPanel(context, x, y, 470, 470);
          drawImageFit(context, image, x + 24, y + 24, 422, 422);
        });
      },
    },
    {
      name: 'safety_digital_download_preview.png',
      draw: ({ context }) => {
        drawTitle(context, 'Digital Download');
        drawBulletList(
          context,
          [
            'No physical item will be shipped',
            'Adult supervision required',
            'Not intended for children under 3',
            'Colors may vary by printer and paper',
          ],
          300,
          610,
          1360,
        );
      },
    },
    {
      name: 'full_topic_list_preview.png',
      draw: ({ context }) => {
        drawTitle(context, 'Mask topic list');
        context.fillStyle = '#243042';
        context.font = '600 48px Arial, sans-serif';
        context.textAlign = 'left';
        subjectNames.forEach((subject, index) => {
          const column = index < 6 ? 0 : 1;
          const row = column === 0 ? index : index - 6;
          const x = column === 0 ? 390 : 1080;
          const y = 560 + row * 155;
          context.fillStyle = '#0f766e';
          context.fillText(String(index + 1).padStart(2, '0'), x - 95, y);
          context.fillStyle = '#243042';
          context.fillText(subject, x, y);
        });
      },
    },
  ];

  const generatedFiles: ManagedFile[] = [];

  for (const definition of definitions) {
    const canvasContext = createCanvasContext();
    await definition.draw(canvasContext);
    const blob = await canvasToBlob(canvasContext.canvas);
    generatedFiles.push(
      createGeneratedFile(blob, definition.name, 'generated-preview', {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
      }),
    );
  }

  return generatedFiles;
};
