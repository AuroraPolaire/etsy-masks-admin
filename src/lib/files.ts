import { DEFAULT_MASK_PROMPT_STYLE, PROMPT_NEGATIVE_REQUIREMENTS } from '../constants';
import { readImageMetadata } from './imageMetadata';
import { slugify } from './slugify';

import type {
  FileAssetVariant,
  FileExportGroups,
  ManagedFile,
  ProjectSettings,
  PromptItem,
  SubjectItem,
} from '../types';

export const getExpectedFilename = (subjectName: string): string => `${slugify(subjectName)}.png`;

export const getColoringPageFilename = (subjectName: string): string =>
  `${slugify(subjectName)}-coloring-page.png`;

const getSubjectMatchForFileName = (
  subjects: SubjectItem[],
  fileName: string,
): { subject: SubjectItem; assetVariant: FileAssetVariant } | undefined => {
  const normalizedFileName = fileName.toLowerCase();

  for (const subject of subjects) {
    if (getColoringPageFilename(subject.name).toLowerCase() === normalizedFileName) {
      return { subject, assetVariant: 'coloring-page' };
    }

    if (getExpectedFilename(subject.name).toLowerCase() === normalizedFileName) {
      return { subject, assetVariant: 'color' };
    }
  }

  return undefined;
};

export const isImageFile = (file: File | ManagedFile): boolean => {
  const name = 'name' in file ? file.name : '';
  const type = 'type' in file ? file.type : '';
  return type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name);
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex] ?? 'B'}`;
};

export const fileToDataUrl = async (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read file data as a data URL'));
    };
    reader.onerror = () => reject(new Error('Could not read file data'));
    reader.readAsDataURL(file);
  });

export const fileToText = async (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read file as text'));
    };
    reader.onerror = () => reject(new Error('Could not read text file'));
    reader.readAsText(file);
  });

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const createManagedFile = async (
  file: File,
  subjects: SubjectItem[],
): Promise<ManagedFile> => {
  const now = new Date().toISOString();
  const imageMetadata = isImageFile(file) ? await readImageMetadata(file) : undefined;
  const fileNameMatch = getSubjectMatchForFileName(subjects, file.name);
  const objectUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    addedAt: now,
    kind: 'uploaded',
    ...(objectUrl ? { objectUrl } : {}),
    ...(imageMetadata ? { imageMetadata } : {}),
    reviewState: 'pending',
    reviewNotes: '',
    ...(fileNameMatch ? { mappedSubjectId: fileNameMatch.subject.id } : {}),
    assetVariant: fileNameMatch?.assetVariant ?? 'color',
    explicitlyConfirmed: false,
  };
};

const cleanPromptStyle = (style: string | undefined): string => {
  const cleanedStyle = style
    ?.replace(/\s+/g, ' ')
    .replace(/[.?!]+$/g, '')
    .trim();
  return cleanedStyle && cleanedStyle.length > 0 ? cleanedStyle : DEFAULT_MASK_PROMPT_STYLE;
};

const createMaskPrompt = (subjectName: string, settings?: Pick<ProjectSettings, 'style'>): string =>
  [
    cleanPromptStyle(settings?.style),
    `Subject: ${subjectName}.`,
    'One standalone printable paper mask only.',
    'Front view, centered composition, symmetrical design, child-friendly expression.',
    'Clearly cut human eye holes with enough space for a child to see through.',
    'Plain white background, no shadows, no scene, no props, no hands.',
    'Clean mask edge shape without any black cutting outline, sticker border, contour line, crop marks, or dashed cut guide.',
    'High-resolution printable craft asset, original artwork.',
    'No text, no watermark.',
  ].join(' ');

export const createPromptItems = (
  subjects: SubjectItem[],
  settings?: Pick<ProjectSettings, 'style'>,
): PromptItem[] =>
  subjects.map((subject) => ({
    subjectId: subject.id,
    subjectName: subject.name,
    expectedFilename: getExpectedFilename(subject.name),
    prompt: createMaskPrompt(subject.name, settings),
    negativeRequirements: PROMPT_NEGATIVE_REQUIREMENTS,
  }));

export const getFileForSubject = (
  files: ManagedFile[],
  subjectId: string,
  state: ManagedFile['reviewState'] = 'approved',
  assetVariant: FileAssetVariant = 'color',
): ManagedFile | undefined => {
  for (let index = files.length - 1; index >= 0; index -= 1) {
    const file = files[index];
    if (
      file?.kind === 'uploaded' &&
      isImageFile(file) &&
      file.mappedSubjectId === subjectId &&
      file.reviewState === state &&
      file.assetVariant === assetVariant
    ) {
      return file;
    }
  }

  return undefined;
};

export const isColoringPageCurrentForSource = (
  coloringPageFile: ManagedFile,
  sourceFile: ManagedFile,
): boolean =>
  coloringPageFile.assetVariant === 'coloring-page' &&
  (!coloringPageFile.sourceFileId || coloringPageFile.sourceFileId === sourceFile.id);

export const getCurrentColoringPageForSubject = (
  files: ManagedFile[],
  subjectId: string,
  sourceFile: ManagedFile,
  state: ManagedFile['reviewState'] = 'approved',
): ManagedFile | undefined => {
  for (let index = files.length - 1; index >= 0; index -= 1) {
    const file = files[index];
    if (
      file?.kind === 'uploaded' &&
      isImageFile(file) &&
      file.mappedSubjectId === subjectId &&
      file.reviewState === state &&
      isColoringPageCurrentForSource(file, sourceFile)
    ) {
      return file;
    }
  }

  return undefined;
};

export const groupFilesForExport = (
  files: ManagedFile[],
  subjects: SubjectItem[],
): FileExportGroups => {
  const validSubjectIds = new Set(subjects.map((subject) => subject.id));
  const usedColorSubjectIds = new Set<string>();
  const usedColoringPageSubjectIds = new Set<string>();
  const newestFiles = [...files].reverse();

  const approvedMapped = newestFiles.filter((file) => {
    if (
      file.kind !== 'uploaded' ||
      !isImageFile(file) ||
      file.assetVariant !== 'color' ||
      file.reviewState !== 'approved' ||
      !file.mappedSubjectId ||
      !validSubjectIds.has(file.mappedSubjectId) ||
      usedColorSubjectIds.has(file.mappedSubjectId)
    ) {
      return false;
    }

    usedColorSubjectIds.add(file.mappedSubjectId);
    return true;
  });
  const approvedColorBySubjectId = new Map(
    approvedMapped
      .filter((file) => file.mappedSubjectId)
      .map((file) => [file.mappedSubjectId!, file]),
  );

  const approvedColoringPages = newestFiles.filter((file) => {
    const approvedColorFile = file.mappedSubjectId
      ? approvedColorBySubjectId.get(file.mappedSubjectId)
      : undefined;

    if (
      file.kind !== 'uploaded' ||
      !isImageFile(file) ||
      file.assetVariant !== 'coloring-page' ||
      file.reviewState !== 'approved' ||
      !file.mappedSubjectId ||
      !validSubjectIds.has(file.mappedSubjectId) ||
      !approvedColorFile ||
      !isColoringPageCurrentForSource(file, approvedColorFile) ||
      usedColoringPageSubjectIds.has(file.mappedSubjectId)
    ) {
      return false;
    }

    usedColoringPageSubjectIds.add(file.mappedSubjectId);
    return true;
  });

  const approvedIds = new Set([...approvedMapped, ...approvedColoringPages].map((file) => file.id));
  const rejected = files.filter(
    (file) => file.kind === 'uploaded' && isImageFile(file) && file.reviewState === 'rejected',
  );
  const rejectedIds = new Set(rejected.map((file) => file.id));
  const unused = files.filter(
    (file) => file.kind === 'uploaded' && !approvedIds.has(file.id) && !rejectedIds.has(file.id),
  );

  return {
    approvedMapped,
    approvedColoringPages,
    rejected,
    unused,
  };
};

export const getSourceFiles = (files: ManagedFile[]): ManagedFile[] =>
  files.filter((file) => file.kind === 'uploaded');

export const createPngBlobFromImage = async (file: File): Promise<Blob> => {
  const dataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not normalize image ${file.name}`));
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is unavailable');
  }

  context.drawImage(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Could not create PNG for ${file.name}`));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
};
