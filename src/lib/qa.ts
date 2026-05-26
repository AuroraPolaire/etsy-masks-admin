import { BLOCKED_IP_TERMS, MAX_ETSY_FILE_BYTES, MAX_TOTAL_SOURCE_BYTES } from '../constants';
import { analyzeEtsySeo } from './etsySeo';
import {
  getExpectedFilename,
  getFileForSubject,
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
  const maskCount = project.subjects.length;
  const titleMaskCount = extractMaskCountFromTitle(project.settings.title);
  const blockedTerms = detectBlockedTerms([
    project.settings.title,
    project.settings.description,
    project.settings.tags,
    project.settings.license,
  ]);
  const etsySeo = analyzeEtsySeo(project);
  const sourceFiles = getSourceFiles(files);
  const sourceTotalSize = sourceFiles.reduce((total, file) => total + file.size, 0);
  const groups = groupFilesForExport(files, project.subjects);
  const expectedFilenames = project.subjects.map((subject) => getExpectedFilename(subject.name));
  const approvedImages = groups.approvedMapped;
  const approvedColoringPages = groups.approvedColoringPages;
  const approvedSubjectIds = new Set(approvedImages.map((file) => file.mappedSubjectId));
  const approvedColoringPageSubjectIds = new Set(
    approvedColoringPages.map((file) => file.mappedSubjectId),
  );
  const duplicateApprovedMappings = approvedImages.length !== approvedSubjectIds.size;
  const hasInvalidApprovedMapping = approvedImages.some(
    (file) => !project.subjects.some((subject) => subject.id === file.mappedSubjectId),
  );
  const everySubjectHasApprovedImage = project.subjects.every((subject) =>
    Boolean(getFileForSubject(files, subject.id)),
  );
  const everySubjectHasColoringPage = project.subjects.every((subject) =>
    approvedColoringPageSubjectIds.has(subject.id),
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
  const finalZipSize = project.nestedEtsyUploadZipSizeBytes;
  const getEtsyCheck = (id: string) => etsySeo.checks.find((check) => check.id === id);
  const etsyTitleWordCount = getEtsyCheck('title-word-count');
  const etsyTitleFrontLoaded = getEtsyCheck('title-front-loaded');
  const etsyTitleReadable = getEtsyCheck('title-readable');
  const etsyTagsCount = getEtsyCheck('tags-count');
  const etsyTagsLength = getEtsyCheck('tags-length');
  const etsyTagsDiverse = getEtsyCheck('tags-diverse');
  const etsyDescriptionLead = getEtsyCheck('description-lead');
  const etsyDescriptionDepth = getEtsyCheck('description-depth');
  const etsyDescriptionStructure = getEtsyCheck('description-structure');
  const etsyDescriptionKeywords = getEtsyCheck('description-keywords');
  const etsyTagsValid = Boolean(etsyTagsLength?.passed && etsyTagsDiverse?.passed);
  const etsyDescriptionUseful = Boolean(
    etsyDescriptionDepth?.passed &&
    etsyDescriptionStructure?.passed &&
    etsyDescriptionKeywords?.passed,
  );

  const checks: QACheck[] = [
    createCheck(
      'title-count',
      'critical',
      maskCount > 0 && titleMaskCount === maskCount,
      'Title includes the correct mask count',
      maskCount === 0
        ? 'Add mask topics before finalizing the listing title count.'
        : titleMaskCount
          ? `Title says ${titleMaskCount}; topic list has ${maskCount}.`
          : `Title should include the mask count: ${maskCount}.`,
    ),
    createCheck(
      'description-digital-download',
      'critical',
      includesPhrase(project.settings.description, 'digital download'),
      'Description says digital download',
      'Buyers need to know this is a digital product.',
    ),
    createCheck(
      'description-no-physical',
      'critical',
      includesPhrase(project.settings.description, 'no physical item will be shipped'),
      'Description says no physical item ships',
      'This disclaimer prevents physical-delivery confusion.',
    ),
    createCheck(
      'safety-adult-supervision',
      'critical',
      includesPhrase(project.settings.safetyNote, 'adult supervision'),
      'Safety note mentions adult supervision',
      'Required for printing, cutting, and use.',
    ),
    createCheck(
      'safety-under-three',
      'critical',
      includesPhrase(project.settings.safetyNote, 'under 3'),
      'Safety note mentions under-3 warning',
      'Required for young-child safety.',
    ),
    createCheck(
      'blocked-ip',
      'critical',
      blockedTerms.length === 0,
      'No obvious blocked IP terms',
      blockedTerms.length
        ? `Review these terms: ${blockedTerms.join(', ')}.`
        : 'No blocked terms found.',
    ),
    createCheck(
      'subject-count',
      'critical',
      maskCount > 0 && expectedFilenames.length === maskCount,
      'Topic list matches the mask count',
      maskCount === 0
        ? 'Add at least one mask topic.'
        : `${maskCount} topic records will generate ${expectedFilenames.length} expected files.`,
    ),
    createCheck(
      'approved-images',
      'critical',
      maskCount > 0 && everySubjectHasApprovedImage,
      'Every topic has an approved image',
      maskCount === 0
        ? 'Add mask topics before approving images.'
        : `${approvedImages.length} of ${maskCount} topics have an approved image.`,
    ),
    createCheck(
      'approved-coloring-pages',
      'critical',
      maskCount > 0 && everySubjectHasColoringPage,
      'Every approved mask has a coloring page',
      maskCount === 0
        ? 'Add topics before preparing coloring pages.'
        : `${approvedColoringPageSubjectIds.size} of ${maskCount} topics have an approved coloring page.`,
    ),
    createCheck(
      'rejected-not-approved',
      'critical',
      groups.rejected.every(
        (file) => !groups.approvedMapped.some((approved) => approved.id === file.id),
      ),
      'Rejected images stay out of the export set',
      'Rejected files are excluded from the ZIP.',
    ),
    createCheck(
      'nested-etsy-size',
      'critical',
      finalZipSize === undefined || finalZipSize <= MAX_ETSY_FILE_BYTES,
      'ZIP is 20MB or less when known',
      finalZipSize === undefined
        ? 'Size will be calculated during archive export.'
        : `${Math.round((finalZipSize / 1024 / 1024) * 10) / 10}MB ZIP.`,
    ),
    createCheck(
      'mapping-assignments',
      'critical',
      !duplicateApprovedMappings && !hasInvalidApprovedMapping,
      'Approved images are assigned correctly',
      duplicateApprovedMappings || hasInvalidApprovedMapping
        ? 'Fix duplicate or missing topic assignments.'
        : 'Each approved image is assigned to one topic.',
    ),
    createCheck(
      'license-refund',
      'warning',
      hasText(project.settings.license) && hasText(project.settings.refundPolicy),
      'License and refund policy are present',
      'Both fields should be included in the exported listing copy.',
    ),
    createCheck(
      'etsy-title-concise',
      'warning',
      etsyTitleWordCount?.passed ?? false,
      'Etsy title is concise and readable',
      etsyTitleWordCount?.details ?? 'Check title length.',
    ),
    createCheck(
      'etsy-title-front-loaded',
      'warning',
      etsyTitleFrontLoaded?.passed ?? false,
      'Etsy title front-loads the product',
      etsyTitleFrontLoaded?.details ?? 'Put the product phrase first.',
    ),
    createCheck(
      'etsy-title-readable',
      'warning',
      etsyTitleReadable?.passed ?? false,
      'Etsy title avoids keyword stuffing',
      etsyTitleReadable?.details ?? 'Avoid repeated keyword chains.',
    ),
    createCheck(
      'etsy-tags-count',
      'warning',
      etsyTagsCount?.passed ?? false,
      'Listing uses all 13 Etsy tags',
      etsyTagsCount?.details ?? 'Use all available tag slots.',
    ),
    createCheck(
      'etsy-tags-valid',
      'warning',
      etsyTagsValid,
      'Etsy tags are valid and diverse',
      [etsyTagsLength?.details, etsyTagsDiverse?.details].filter(Boolean).join(' '),
    ),
    createCheck(
      'etsy-description-lead',
      'warning',
      etsyDescriptionLead?.passed ?? false,
      'Description opens with clear product copy',
      etsyDescriptionLead?.details ?? 'Make the first sentence describe the product.',
    ),
    createCheck(
      'etsy-description-useful',
      'warning',
      etsyDescriptionUseful,
      'Description is detailed and organized',
      [
        etsyDescriptionDepth?.details,
        etsyDescriptionStructure?.details,
        etsyDescriptionKeywords?.details,
      ]
        .filter(Boolean)
        .join(' '),
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
      'Every approved image is reviewed',
      'Approve each image or add notes to record manual review.',
    ),
    createCheck(
      'etsy-file-count',
      'warning',
      true,
      'Etsy upload count stays low',
      'The ZIP contains individual mask PNGs plus one listing PDF.',
    ),
    createInfoCheck(
      'project-json-exported',
      Boolean(project.lastProjectJsonExportAt),
      'Project JSON has been exported',
      project.lastProjectJsonExportAt
        ? `Last exported ${project.lastProjectJsonExportAt}.`
        : 'Not exported yet.',
    ),
    createInfoCheck(
      'archive-exported',
      Boolean(project.lastArchiveExportAt),
      'Archive has been exported',
      project.lastArchiveExportAt
        ? `Last exported ${project.lastArchiveExportAt}.`
        : 'Not exported yet.',
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
