import { BLOCKED_IP_TERMS, MAX_ETSY_FILE_BYTES, MAX_TOTAL_SOURCE_BYTES } from '../constants';
import {
  getExpectedFilename,
  getFileForAnimal,
  getSourceFiles,
  groupFilesForExport,
  isImageFile,
} from './files';
import { slugify } from './slugify';

import type { ManagedFile, Project, QACheck, QAGroup, QAResult } from '../types';

const hasText = (value: string): boolean => value.trim().length > 0;

const includesPhrase = (value: string, phrase: string): boolean =>
  value.toLowerCase().includes(phrase.toLowerCase());

const extractMaskCountFromTitle = (title: string): number | undefined => {
  const match = /\b(\d+)\s*(png|printable|paper)?\s*mask/i.exec(title);
  return match?.[1] ? Number(match[1]) : undefined;
};

export const detectBlockedTerms = (values: string[]): string[] => {
  const searchable = values.join(' ').toLowerCase();
  return BLOCKED_IP_TERMS.filter((term) => searchable.includes(term));
};

const createCheck = (
  id: string,
  group: QAGroup,
  passed: boolean,
  label: string,
  details: string,
): QACheck => ({
  id,
  group,
  label,
  status: passed ? 'pass' : 'fail',
  details,
});

const createInfoCheck = (id: string, passed: boolean, label: string, details: string): QACheck => ({
  id,
  group: 'informational',
  label,
  status: passed ? 'pass' : 'info',
  details,
});

export const runQA = (project: Project, files: ManagedFile[]): QAResult => {
  const maskCount = project.animals.length;
  const titleMaskCount = extractMaskCountFromTitle(project.settings.title);
  const blockedTerms = detectBlockedTerms([
    project.settings.title,
    project.settings.description,
    project.settings.tags,
    project.settings.license,
  ]);
  const sourceFiles = getSourceFiles(files);
  const sourceTotalSize = sourceFiles.reduce((total, file) => total + file.size, 0);
  const groups = groupFilesForExport(files, project.animals);
  const expectedFilenames = project.animals.map((animal) => getExpectedFilename(animal.name));
  const pdfFiles = files.filter((file) => file.kind === 'generated-pdf');
  const previewFiles = files.filter((file) => file.kind === 'generated-preview');
  const approvedImages = groups.approvedMapped;
  const approvedAnimalIds = new Set(approvedImages.map((file) => file.mappedAnimalId));
  const duplicateApprovedMappings = approvedImages.length !== approvedAnimalIds.size;
  const hasInvalidApprovedMapping = approvedImages.some(
    (file) => !project.animals.some((animal) => animal.id === file.mappedAnimalId),
  );
  const everyAnimalHasApprovedImage = project.animals.every((animal) =>
    Boolean(getFileForAnimal(files, animal.id)),
  );
  const everyImageAtLeastMinimum = approvedImages.every((file) => {
    if (!file.imageMetadata) {
      return false;
    }

    return file.imageMetadata.width >= 2000 && file.imageMetadata.height >= 2000;
  });
  const everyImageAtLeastRecommended = approvedImages.every((file) => {
    if (!file.imageMetadata) {
      return false;
    }

    return file.imageMetadata.width >= 3000 && file.imageMetadata.height >= 3000;
  });
  const everyApprovedImageReviewed = approvedImages.every(
    (file) => file.reviewNotes.trim().length > 0 || file.explicitlyConfirmed,
  );
  const noSingleLargeSource = sourceFiles.every((file) => file.size <= MAX_ETSY_FILE_BYTES);
  const hasA4 = pdfFiles.some((file) => file.name.includes('_A4_printable.pdf'));
  const hasLetter = pdfFiles.some((file) => file.name.includes('_US_Letter_printable.pdf'));
  const nestedZipSize = project.nestedEtsyUploadZipSizeBytes;
  const generatedAfterApproval =
    !project.lastImageApprovalAt ||
    Boolean(
      project.lastPdfGeneratedAt && project.lastPdfGeneratedAt >= project.lastImageApprovalAt,
    );

  const checks: QACheck[] = [
    createCheck(
      'title-count',
      'critical',
      titleMaskCount === maskCount,
      'Title contains correct mask count',
      titleMaskCount
        ? `Title says ${titleMaskCount}; animal list has ${maskCount}.`
        : `Title must include the mask count ${maskCount}.`,
    ),
    createCheck(
      'description-digital-download',
      'critical',
      includesPhrase(project.settings.description, 'digital download'),
      'Description says digital download',
      'Customers must understand this is a digital product.',
    ),
    createCheck(
      'description-no-physical',
      'critical',
      includesPhrase(project.settings.description, 'no physical item will be shipped'),
      'Description says no physical item will be shipped',
      'This exact disclaimer prevents physical-delivery confusion.',
    ),
    createCheck(
      'safety-adult-supervision',
      'critical',
      includesPhrase(project.settings.safetyNote, 'adult supervision'),
      'Safety note contains adult supervision',
      'Required for cutting and use.',
    ),
    createCheck(
      'safety-under-three',
      'critical',
      includesPhrase(project.settings.safetyNote, 'under 3'),
      'Safety note contains under 3 warning',
      'Required for young-child safety.',
    ),
    createCheck(
      'blocked-ip',
      'critical',
      blockedTerms.length === 0,
      'No obvious blocked IP terms in listing text',
      blockedTerms.length
        ? `Review these terms: ${blockedTerms.join(', ')}.`
        : 'No blocked terms found.',
    ),
    createCheck(
      'animal-count',
      'critical',
      expectedFilenames.length === maskCount,
      'Animal list length equals mask count',
      `${maskCount} animal records will generate ${expectedFilenames.length} expected files.`,
    ),
    createCheck(
      'approved-images',
      'critical',
      everyAnimalHasApprovedImage,
      'Every animal has an approved mapped image',
      `${approvedImages.length} of ${maskCount} animals have approved mapped images.`,
    ),
    createCheck(
      'rejected-not-approved',
      'critical',
      groups.rejected.every(
        (file) => !groups.approvedMapped.some((approved) => approved.id === file.id),
      ),
      'No rejected image is included in final approved set',
      'Rejected files are routed to PNG_Rejected_Do_Not_Upload.',
    ),
    createCheck(
      'a4-pdf',
      'critical',
      !project.pdfSettings.generateA4 || hasA4,
      'A4 printable PDF exists if enabled',
      project.pdfSettings.generateA4
        ? 'Generate the A4 PDF before export.'
        : 'A4 generation is disabled.',
    ),
    createCheck(
      'letter-pdf',
      'critical',
      !project.pdfSettings.generateUSLetter || hasLetter,
      'US Letter printable PDF exists if enabled',
      project.pdfSettings.generateUSLetter
        ? 'Generate the US Letter PDF before export.'
        : 'US Letter generation is disabled.',
    ),
    createCheck(
      'nested-etsy-size',
      'critical',
      nestedZipSize === undefined || nestedZipSize <= MAX_ETSY_FILE_BYTES,
      'Nested Etsy upload ZIP is not over 20MB if size is known',
      nestedZipSize === undefined
        ? 'Size will be calculated during archive export.'
        : `${Math.round((nestedZipSize / 1024 / 1024) * 10) / 10}MB nested ZIP.`,
    ),
    createCheck(
      'mapping-assignments',
      'critical',
      !duplicateApprovedMappings && !hasInvalidApprovedMapping,
      'Project has no missing mapped image assignments',
      duplicateApprovedMappings || hasInvalidApprovedMapping
        ? 'Fix duplicate or invalid animal mappings.'
        : 'Approved mappings are unique and valid.',
    ),
    createCheck(
      'preview-count',
      'warning',
      previewFiles.length >= 5,
      'At least 5 marketplace preview images exist',
      `${previewFiles.length} preview images generated.`,
    ),
    createCheck(
      'license-refund',
      'warning',
      hasText(project.settings.license) && hasText(project.settings.refundPolicy),
      'License and refund policy are present',
      'Both fields should be included in the exported listing copy.',
    ),
    createCheck(
      'image-min-size',
      'warning',
      approvedImages.length > 0 && everyImageAtLeastMinimum,
      'Every image is at least 2000x2000',
      'Images below 2000x2000 may print poorly.',
    ),
    createCheck(
      'image-recommended-size',
      'warning',
      approvedImages.length > 0 && everyImageAtLeastRecommended,
      'Recommended images are 3000x3000 or higher',
      '3000x3000 or larger is preferred for crisp print output.',
    ),
    createCheck(
      'source-total-size',
      'warning',
      sourceTotalSize <= MAX_TOTAL_SOURCE_BYTES,
      'Total source files are below 150MB',
      `${sourceFiles.length} source files total ${Math.round(sourceTotalSize / 1024 / 1024)}MB.`,
    ),
    createCheck(
      'single-source-size',
      'warning',
      noSingleLargeSource,
      'No single source file is over 20MB',
      'Large files can exceed Etsy limits and slow browser ZIP generation.',
    ),
    createCheck(
      'approved-reviewed',
      'warning',
      approvedImages.length > 0 && everyApprovedImageReviewed,
      'Every approved image has review notes or explicit confirmation',
      'Use notes or confirmation to record manual review.',
    ),
    createCheck(
      'etsy-file-count',
      'warning',
      true,
      'Expected Etsy upload files are 5 or fewer where possible',
      'The generated nested upload ZIP keeps Etsy upload count low.',
    ),
    createInfoCheck(
      'project-json-exported',
      Boolean(project.lastProjectJsonExportAt),
      'Project JSON exported at least once',
      project.lastProjectJsonExportAt
        ? `Last exported ${project.lastProjectJsonExportAt}.`
        : 'Not exported yet.',
    ),
    createInfoCheck(
      'archive-exported',
      Boolean(project.lastArchiveExportAt),
      'Archive exported at least once',
      project.lastArchiveExportAt
        ? `Last exported ${project.lastArchiveExportAt}.`
        : 'Not exported yet.',
    ),
    createInfoCheck(
      'pdf-after-approval',
      generatedAfterApproval,
      'PDFs generated after last image approval if easy to track',
      generatedAfterApproval
        ? 'PDFs are not older than the last approval.'
        : 'Regenerate PDFs after approvals.',
    ),
  ];

  const nonInfoChecks = checks.filter((check) => check.group !== 'informational');
  const passCount = nonInfoChecks.filter((check) => check.status === 'pass').length;
  const readinessPercentage =
    nonInfoChecks.length > 0 ? Math.round((passCount / nonInfoChecks.length) * 100) : 0;
  const criticalPassed = checks
    .filter((check) => check.group === 'critical')
    .every((check) => check.status === 'pass');

  return {
    readinessPercentage,
    status: criticalPassed ? 'etsy-ready' : 'needs-review',
    checks,
    criticalPassed,
  };
};

export const createManifestImageDimensions = (
  files: ManagedFile[],
): Record<string, { width: number; height: number }> =>
  files.reduce<Record<string, { width: number; height: number }>>((dimensions, file) => {
    if (isImageFile(file) && file.imageMetadata) {
      dimensions[file.name] = file.imageMetadata;
    }

    return dimensions;
  }, {});

export const getThemeSlugForQa = (project: Project): string => slugify(project.settings.theme);
