import JSZip from 'jszip';
import { APP_VERSION, MAX_ETSY_FILE_BYTES } from '../constants';
import type { ExportManifest, ManagedFile, Project, QAResult } from '../types';
import {
  createPngBlobFromImage,
  fileToText,
  formatBytes,
  getExpectedFilename,
  getSourceFiles,
  groupFilesForExport,
} from './files';
import { createManifestImageDimensions, runQA } from './qa';
import { slugify } from './slugify';

type ArchiveResult = {
  blob: Blob;
  fileName: string;
  manifest: ExportManifest;
  nestedEtsyUploadZipSizeBytes: number;
  needsReview: boolean;
};

const addText = (zip: JSZip, path: string, value: string): void => {
  zip.file(path, `${value.trim()}\n`);
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
    `- ${project.animals.length} printable animal mask designs`,
    '- Transparent PNG mask files',
    project.pdfSettings.generateA4 ? '- A4 printable PDF' : '',
    project.pdfSettings.generateUSLetter ? '- US Letter printable PDF' : '',
    '- Printing and cutting instructions',
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

const createReadMeFirst = (project: Project): string =>
  [
    'READ ME FIRST',
    '',
    'This is a digital download only. No physical item will be shipped.',
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
    'Refund note:',
    project.settings.refundPolicy,
  ].join('\n');

const createPromptText = (project: Project): string =>
  project.animals
    .map((animal) =>
      [
        animal.name,
        `Filename: ${getExpectedFilename(animal.name)}`,
        `Prompt: Front-facing realistic ${animal.name.toLowerCase()} face paper mask for children, friendly expression, symmetrical face, centered composition, transparent background, printable craft asset, high resolution, clear human eye holes, no text, no watermark, no background, original artwork.`,
        'Negative requirements: no copyrighted character, no brand, no celebrity, no text, no watermark, no scary expression, no full body, no background, no distorted face',
      ].join('\n'),
    )
    .join('\n\n');

const addApprovedPngs = async (
  zip: JSZip,
  basePath: string,
  project: Project,
  files: ManagedFile[],
): Promise<void> => {
  for (const file of files) {
    const animal = project.animals.find((item) => item.id === file.mappedAnimalId);
    if (!animal) {
      continue;
    }

    const pngBlob = await createPngBlobFromImage(file.file);
    zip.file(`${basePath}/${getExpectedFilename(animal.name)}`, pngBlob);
  }
};

const addFiles = (zip: JSZip, basePath: string, files: ManagedFile[]): void => {
  files.forEach((file) => {
    zip.file(`${basePath}/${file.name}`, file.file);
  });
};

const createNestedEtsyZip = async (
  project: Project,
  files: ManagedFile[],
  listingCopy: string,
): Promise<Blob> => {
  const groups = groupFilesForExport(files, project.animals);
  const pdfFiles = files.filter((file) => file.kind === 'generated-pdf');
  const previewFiles = files.filter((file) => file.kind === 'generated-preview');
  const zip = new JSZip();

  await addApprovedPngs(zip, 'PNG_Approved', project, groups.approvedMapped);
  addFiles(zip, 'Printable_PDFs', pdfFiles);
  addFiles(zip, 'Preview_Images', previewFiles);
  addText(zip, 'listing_copy.txt', listingCopy);
  addText(zip, 'READ_ME_FIRST.txt', createReadMeFirst(project));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 7 } });
};

const createManifest = (
  project: Project,
  files: ManagedFile[],
  qaResult: QAResult,
  nestedEtsyUploadZipSizeBytes: number,
): ExportManifest => {
  const groups = groupFilesForExport(files, project.animals);
  const sourceFiles = getSourceFiles(files);
  const pdfFiles = files.filter((file) => file.kind === 'generated-pdf');
  const previewFiles = files.filter((file) => file.kind === 'generated-preview');
  const mappedImages = groups.approvedMapped.reduce<Record<string, string>>((mapped, file) => {
    const animal = project.animals.find((item) => item.id === file.mappedAnimalId);
    if (animal) {
      mapped[animal.name] = file.name;
    }

    return mapped;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    marketplace: project.settings.marketplace,
    theme: project.settings.theme,
    title: project.settings.title,
    maskCount: project.animals.length,
    animals: project.animals.map((animal) => animal.name),
    expectedFilenames: project.animals.map((animal) => getExpectedFilename(animal.name)),
    approvedImages: groups.approvedMapped.map((file) => file.name),
    rejectedImages: groups.rejected.map((file) => file.name),
    unusedImages: groups.unused.map((file) => file.name),
    mappedImages,
    imageDimensions: createManifestImageDimensions(files),
    pdfFiles: pdfFiles.map((file) => file.name),
    marketplacePreviewFiles: previewFiles.map((file) => file.name),
    sourceFileCount: sourceFiles.length,
    sourceTotalSizeBytes: sourceFiles.reduce((total, file) => total + file.size, 0),
    nestedEtsyUploadZipSizeBytes,
    qaStatus: qaResult.status,
    qaChecks: qaResult.checks,
    pdfSettings: project.pdfSettings,
  };
};

const createArchiveReadme = (
  project: Project,
  qaStatus: QAResult['status'],
  nestedSizeBytes: number,
): string =>
  [
    'Etsy printable mask bundle archive',
    '',
    `QA status: ${qaStatus}`,
    `Mask count: ${project.animals.length}`,
    `Nested Etsy upload ZIP size: ${formatBytes(nestedSizeBytes)}`,
    '',
    'Manual final checklist:',
    '1. Open the PDFs.',
    '2. Print one sample page.',
    '3. Check mask size and eye-hole placement.',
    '4. Confirm files open.',
    '5. Confirm listing count matches actual files.',
    '6. Confirm no copyrighted or branded characters.',
    '7. Confirm digital download disclaimer is present.',
    '8. Upload manually to Etsy.',
    '9. Keep Etsy file limits in mind.',
  ].join('\n');

export const exportArchive = async (
  project: Project,
  files: ManagedFile[],
): Promise<ArchiveResult> => {
  const themeSlug = slugify(project.settings.theme);
  const basePath = `${themeSlug}_etsy_bundle`;
  const listingCopy = createListingCopy(project);
  const groups = groupFilesForExport(files, project.animals);
  const pdfFiles = files.filter((file) => file.kind === 'generated-pdf');
  const previewFiles = files.filter((file) => file.kind === 'generated-preview');
  const nestedZipBlob = await createNestedEtsyZip(project, files, listingCopy);
  const nestedSize = nestedZipBlob.size;
  const qaWithNestedSize = runQA({ ...project, nestedEtsyUploadZipSizeBytes: nestedSize }, files);
  const manifest = createManifest(project, files, qaWithNestedSize, nestedSize);
  const zip = new JSZip();

  addText(zip, `${basePath}/01_Etsy_Listing/title.txt`, project.settings.title);
  addText(zip, `${basePath}/01_Etsy_Listing/description.txt`, project.settings.description);
  addText(zip, `${basePath}/01_Etsy_Listing/tags.txt`, project.settings.tags);
  addText(zip, `${basePath}/01_Etsy_Listing/safety_note.txt`, project.settings.safetyNote);
  addText(zip, `${basePath}/01_Etsy_Listing/printing_instructions.txt`, project.settings.printingInstructions);
  addText(zip, `${basePath}/01_Etsy_Listing/license.txt`, project.settings.license);
  addText(zip, `${basePath}/01_Etsy_Listing/refund_policy.txt`, project.settings.refundPolicy);
  addText(zip, `${basePath}/01_Etsy_Listing/full_listing_copy.txt`, listingCopy);

  zip.file(
    `${basePath}/02_Image_Prompts/image_prompts.json`,
    JSON.stringify(
      project.animals.map((animal) => ({
        animal: animal.name,
        expectedFilename: getExpectedFilename(animal.name),
        prompt: `Front-facing realistic ${animal.name.toLowerCase()} face paper mask for children, friendly expression, symmetrical face, centered composition, transparent background, printable craft asset, high resolution, clear human eye holes, no text, no watermark, no background, original artwork.`,
        negativeRequirements:
          'no copyrighted character, no brand, no celebrity, no text, no watermark, no scary expression, no full body, no background, no distorted face',
      })),
      null,
      2,
    ),
  );
  addText(zip, `${basePath}/02_Image_Prompts/image_prompts.txt`, createPromptText(project));

  await addApprovedPngs(zip, `${basePath}/03_Assets/PNG_Approved`, project, groups.approvedMapped);
  addFiles(zip, `${basePath}/03_Assets/PNG_Rejected_Do_Not_Upload`, groups.rejected);
  addFiles(zip, `${basePath}/03_Assets/Extra_Unused_Do_Not_Upload`, groups.unused);
  addFiles(zip, `${basePath}/03_Assets/Printable_PDFs`, pdfFiles);
  addFiles(zip, `${basePath}/03_Assets/Marketplace_Preview_Images`, previewFiles);

  zip.file(`${basePath}/04_Etsy_Upload_Files/${themeSlug}_etsy_upload_bundle.zip`, nestedZipBlob);
  addText(zip, `${basePath}/04_Etsy_Upload_Files/listing_copy.txt`, listingCopy);
  zip.file(`${basePath}/05_QA/qa_report.json`, JSON.stringify(qaWithNestedSize, null, 2));
  zip.file(`${basePath}/manifest.json`, JSON.stringify(manifest, null, 2));
  zip.file(`${basePath}/project_backup.json`, JSON.stringify({ appVersion: APP_VERSION, project }, null, 2));
  addText(zip, `${basePath}/README.txt`, createArchiveReadme(project, qaWithNestedSize.status, nestedSize));

  const archiveBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 7 },
  });

  return {
    blob: archiveBlob,
    fileName: `${themeSlug}_etsy_ready_archive.zip`,
    manifest,
    nestedEtsyUploadZipSizeBytes: nestedSize,
    needsReview: qaWithNestedSize.status !== 'etsy-ready' || nestedSize > MAX_ETSY_FILE_BYTES,
  };
};

export const importProjectBackupFromFile = async (file: File): Promise<string> => fileToText(file);
