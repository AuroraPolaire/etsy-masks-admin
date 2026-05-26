import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

import { APP_VERSION, MAX_ETSY_FILE_BYTES } from '../constants';
import {
  createPngBlobFromImage,
  fileToText,
  getColoringPageFilename,
  getExpectedFilename,
  getSourceFiles,
  groupFilesForExport,
} from './files';
import { createManifestImageDimensions, runQA } from './qa';
import { slugify } from './slugify';

import type { ExportManifest, ManagedFile, Project, QAResult } from '../types';

type ArchiveResult = {
  blob: Blob;
  fileName: string;
  manifest: ExportManifest;
  nestedEtsyUploadZipSizeBytes: number;
  needsReview: boolean;
};

export const createListingCopy = (project: Project): string => {
  const tags = project.settings.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(', ');

  return [
    project.settings.title,
    '',
    project.settings.description,
    '',
    'What is included:',
    `- ${project.subjects.length} printable mask designs`,
    '- Individual color PNG mask files',
    '- Matching black and white coloring-page PNG files',
    '- One listing details PDF',
    '- Digital download only',
    '',
    'Printing instructions:',
    project.settings.printingInstructions,
    '',
    'Safety note:',
    project.settings.safetyNote,
    '',
    'License:',
    project.settings.license,
    '',
    'Refund policy:',
    project.settings.refundPolicy,
    '',
    `Tags: ${tags}`,
  ]
    .filter((line) => line !== '')
    .join('\n');
};

const addApprovedPngs = async (
  zip: JSZip,
  basePath: string,
  project: Project,
  files: ManagedFile[],
): Promise<void> => {
  for (const file of files) {
    const subject = project.subjects.find((item) => item.id === file.mappedSubjectId);
    if (!subject) {
      continue;
    }

    const pngBlob = await createPngBlobFromImage(file.file);
    const fileName =
      file.assetVariant === 'coloring-page'
        ? getColoringPageFilename(subject.name)
        : getExpectedFilename(subject.name);
    zip.file(`${basePath}/${fileName}`, pngBlob);
  }
};

export const createListingPdf = (
  project: Project,
  listingCopy = createListingCopy(project),
): Blob => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  const lineHeight = 14;
  let y = margin;

  const addPageIfNeeded = (height = lineHeight) => {
    if (y + height <= pageHeight - margin) {
      return;
    }

    doc.addPage();
    y = margin;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Etsy Listing Details', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toISOString()}`, margin, y);
  y += 22;

  doc.setFontSize(11);
  listingCopy.split('\n').forEach((paragraph) => {
    if (!paragraph.trim()) {
      y += 8;
      return;
    }

    const lines = doc.splitTextToSize(paragraph, maxLineWidth) as string[];
    lines.forEach((line) => {
      addPageIfNeeded();
      doc.text(line, margin, y);
      y += lineHeight;
    });
  });

  return doc.output('blob');
};

const createManifest = (
  project: Project,
  files: ManagedFile[],
  qaResult: QAResult,
  nestedEtsyUploadZipSizeBytes: number,
): ExportManifest => {
  const groups = groupFilesForExport(files, project.subjects);
  const sourceFiles = getSourceFiles(files);
  const mappedImages = groups.approvedMapped.reduce<Record<string, string>>((mapped, file) => {
    const subject = project.subjects.find((item) => item.id === file.mappedSubjectId);
    if (subject) {
      mapped[subject.name] = file.name;
    }

    return mapped;
  }, {});
  const mappedColoringPages = groups.approvedColoringPages.reduce<Record<string, string>>(
    (mapped, file) => {
      const subject = project.subjects.find((item) => item.id === file.mappedSubjectId);
      if (subject) {
        mapped[subject.name] = file.name;
      }

      return mapped;
    },
    {},
  );

  return {
    generatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    marketplace: project.settings.marketplace,
    theme: project.settings.theme,
    title: project.settings.title,
    maskCount: project.subjects.length,
    subjects: project.subjects.map((subject) => subject.name),
    expectedFilenames: project.subjects.map((subject) => getExpectedFilename(subject.name)),
    expectedColoringPageFilenames: project.subjects.map((subject) =>
      getColoringPageFilename(subject.name),
    ),
    approvedImages: groups.approvedMapped.map((file) => file.name),
    approvedColoringPages: groups.approvedColoringPages.map((file) => file.name),
    rejectedImages: groups.rejected.map((file) => file.name),
    unusedImages: groups.unused.map((file) => file.name),
    mappedImages,
    mappedColoringPages,
    imageDimensions: createManifestImageDimensions(files),
    pdfFiles: ['listing_details.pdf'],
    marketplacePreviewFiles: [],
    sourceFileCount: sourceFiles.length,
    sourceTotalSizeBytes: sourceFiles.reduce((total, file) => total + file.size, 0),
    nestedEtsyUploadZipSizeBytes,
    qaStatus: qaResult.status,
    qaChecks: qaResult.checks,
    pdfSettings: project.pdfSettings,
  };
};

export const exportArchive = async (
  project: Project,
  files: ManagedFile[],
): Promise<ArchiveResult> => {
  const themeSlug = slugify(project.settings.theme);
  const listingCopy = createListingCopy(project);
  const listingPdf = createListingPdf(project, listingCopy);
  const groups = groupFilesForExport(files, project.subjects);
  const zip = new JSZip();

  await addApprovedPngs(zip, 'mask_pngs/color', project, groups.approvedMapped);
  await addApprovedPngs(zip, 'mask_pngs/coloring_pages', project, groups.approvedColoringPages);
  zip.file('listing_details.pdf', listingPdf);

  const archiveBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 7 },
  });
  const archiveSize = archiveBlob.size;
  const qaWithArchiveSize = runQA({ ...project, nestedEtsyUploadZipSizeBytes: archiveSize }, files);
  const manifest = createManifest(project, files, qaWithArchiveSize, archiveSize);

  return {
    blob: archiveBlob,
    fileName: `${themeSlug}_etsy_final_files.zip`,
    manifest,
    nestedEtsyUploadZipSizeBytes: archiveSize,
    needsReview: qaWithArchiveSize.status !== 'etsy-ready' || archiveSize > MAX_ETSY_FILE_BYTES,
  };
};

export const importProjectBackupFromFile = async (file: File): Promise<string> => fileToText(file);
