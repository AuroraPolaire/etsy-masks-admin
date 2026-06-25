import { MAX_MASK_SHEET_MASKS_PER_IMAGE, MIN_MASK_SHEET_MASKS_PER_IMAGE } from '../constants';

import type {
  Marketplace,
  MarketingSettings,
  MaskScale,
  EtsySeoAnalysis,
  EtsySeoCheck,
  OpenAIImageBackground,
  OpenAIImageModel,
  OpenAIImageOutputFormat,
  OpenAIImageQuality,
  OpenAIImageSize,
  OpenAIImageSettings,
  Project,
  ProjectSettings,
  SubjectItem,
} from '../types';

const LEGACY_MOCK_SUBJECT_SETS = [
  [
    'Robot',
    'Dinosaur',
    'Unicorn',
    'Dragon',
    'Astronaut',
    'Pirate',
    'Butterfly',
    'Flower',
    'Sun',
    'Moon',
    'Lion',
    'Owl',
  ],
  [
    'Lion',
    'Tiger',
    'Elephant',
    'Giraffe',
    'Zebra',
    'Panda',
    'Fox',
    'Wolf',
    'Bear',
    'Rabbit',
    'Deer',
    'Owl',
  ],
];

const LEGACY_MOCK_TITLE_PATTERNS = [
  /^Realistic Animal Masks Printable Bundle for Kids,\s*3 PNG Paper Masks,\s*Safari Zoo Party,\s*Classroom Craft,\s*Digital Download$/i,
  /^Printable Paper Mask Bundle for Kids,\s*Party Craft,\s*Classroom Activity,\s*Digital Download$/i,
];

const optionalProjectDateFields = [
  'lastProjectJsonExportAt',
  'lastArchiveExportAt',
  'lastPdfGeneratedAt',
  'lastPreviewGeneratedAt',
  'lastImageApprovalAt',
  'lastBriefUpdatedAt',
  'lastEtsySeoGeneratedAt',
] as const;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const readRequiredString = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readMarketplace = (value: unknown, fallback: Marketplace): Marketplace =>
  value === 'Etsy' || value === 'Other' ? value : fallback;

const readMaskScale = (value: unknown, fallback: MaskScale): MaskScale =>
  value === 'small' || value === 'medium' || value === 'large' ? value : fallback;

const readEnum = <Value extends string>(
  value: unknown,
  allowedValues: readonly Value[],
  fallback: Value,
): Value =>
  typeof value === 'string' && allowedValues.includes(value as Value) ? (value as Value) : fallback;

const readBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const readPageMarginMm = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 5), 30);
};

const readOptionalNonNegativeNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

const readMaskSheetMasksPerImage = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    MAX_MASK_SHEET_MASKS_PER_IMAGE,
    Math.max(MIN_MASK_SHEET_MASKS_PER_IMAGE, Math.round(value)),
  );
};

const isLegacyMockSubjectList = (subjects: SubjectItem[]): boolean =>
  LEGACY_MOCK_SUBJECT_SETS.some(
    (mockSubjects) =>
      subjects.length === mockSubjects.length &&
      subjects.every((subject, index) => subject.name === mockSubjects[index]),
  );

const removeLegacyMockSubjects = (subjects: SubjectItem[]): SubjectItem[] =>
  isLegacyMockSubjectList(subjects) ? [] : subjects;

const hasLegacyMockTitle = (settings: ProjectSettings): boolean =>
  LEGACY_MOCK_TITLE_PATTERNS.some((pattern) => pattern.test(settings.title.trim()));

const readSubjects = (projectLike: Record<string, unknown>): SubjectItem[] => {
  const rawSubjects = Array.isArray(projectLike.subjects)
    ? projectLike.subjects
    : Array.isArray(projectLike.animals)
      ? projectLike.animals
      : [];

  return rawSubjects
    .filter(isRecord)
    .map((subject) => ({
      id:
        typeof subject.id === 'string' && subject.id.trim().length > 0
          ? subject.id
          : crypto.randomUUID(),
      name: typeof subject.name === 'string' ? subject.name.trim() : '',
    }))
    .filter((subject) => subject.name.length > 0);
};

const readSettings = (
  settingsLike: unknown,
  fallbackSettings: ProjectSettings,
): ProjectSettings => {
  const settings = isRecord(settingsLike) ? settingsLike : {};

  return {
    title: readString(settings.title, fallbackSettings.title),
    theme: readString(settings.theme, fallbackSettings.theme),
    audience: readString(settings.audience, fallbackSettings.audience),
    marketplace: readMarketplace(settings.marketplace, fallbackSettings.marketplace),
    style: readString(settings.style, fallbackSettings.style),
    description: readString(settings.description, fallbackSettings.description),
    tags: readString(settings.tags, fallbackSettings.tags),
    safetyNote: readString(settings.safetyNote, fallbackSettings.safetyNote),
    printingInstructions: readString(
      settings.printingInstructions,
      fallbackSettings.printingInstructions,
    ),
    license: readString(settings.license, fallbackSettings.license),
    refundPolicy: readString(settings.refundPolicy, fallbackSettings.refundPolicy),
  };
};

const readPdfSettings = (
  pdfSettingsLike: unknown,
  fallback: Project['pdfSettings'],
): Project['pdfSettings'] => {
  const pdfSettings = isRecord(pdfSettingsLike) ? pdfSettingsLike : {};

  return {
    generateA4: readBoolean(pdfSettings.generateA4, fallback.generateA4),
    generateUSLetter: readBoolean(pdfSettings.generateUSLetter, fallback.generateUSLetter),
    maskScale: readMaskScale(pdfSettings.maskScale, fallback.maskScale),
    showSubjectLabel: readBoolean(
      pdfSettings.showSubjectLabel ?? pdfSettings.showAnimalLabel,
      fallback.showSubjectLabel,
    ),
    showInstructionFooter: readBoolean(
      pdfSettings.showInstructionFooter,
      fallback.showInstructionFooter,
    ),
    pageMarginMm: readPageMarginMm(pdfSettings.pageMarginMm, fallback.pageMarginMm),
    includeCalibrationPage: readBoolean(
      pdfSettings.includeCalibrationPage,
      fallback.includeCalibrationPage,
    ),
  };
};

const readOpenAIImageSettings = (
  settingsLike: unknown,
  fallback: OpenAIImageSettings,
): OpenAIImageSettings => {
  const settings = isRecord(settingsLike) ? settingsLike : {};
  const size = readEnum<OpenAIImageSize>(
    settings.size,
    [
      '512x512',
      '1024x1024',
      '1536x1536',
      '1536x1024',
      '1024x1536',
      '2048x2048',
      '2048x1152',
      '1152x2048',
      'auto',
    ],
    fallback.size,
  );

  return {
    model: readEnum<OpenAIImageModel>(
      settings.model,
      ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'],
      fallback.model,
    ),
    size: size === '512x512' ? '1024x1024' : size,
    quality: readEnum<OpenAIImageQuality>(
      settings.quality,
      ['low', 'medium', 'high', 'auto'],
      fallback.quality,
    ),
    background: readEnum<OpenAIImageBackground>(
      settings.background,
      ['transparent', 'opaque', 'auto'],
      fallback.background,
    ),
    outputFormat: readEnum<OpenAIImageOutputFormat>(
      settings.outputFormat,
      ['png', 'webp', 'jpeg'],
      fallback.outputFormat,
    ),
    coloringPageSize: readEnum<'1024x1024' | '1536x1024' | '1024x1536'>(
      settings.coloringPageSize,
      ['1024x1024', '1536x1024', '1024x1536'],
      fallback.coloringPageSize,
    ),
  };
};

const readMarketingImageSettings = (
  settingsLike: unknown,
  fallback: MarketingSettings['preview']['customSettings'],
): MarketingSettings['preview']['customSettings'] => {
  const settings = isRecord(settingsLike) ? settingsLike : {};
  const size = readEnum<OpenAIImageSize>(
    settings.size,
    [
      '512x512',
      '1024x1024',
      '1536x1536',
      '1536x1024',
      '1024x1536',
      '2048x2048',
      '2048x1152',
      '1152x2048',
      'auto',
    ],
    fallback.size,
  );
  const quality = readEnum<OpenAIImageQuality>(
    settings.quality,
    ['low', 'medium', 'high', 'auto'],
    fallback.quality,
  );

  return {
    model: readEnum<OpenAIImageModel>(
      settings.model,
      ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'],
      fallback.model,
    ),
    size: size === '512x512' ? '1024x1024' : size,
    quality: quality === 'high' ? 'medium' : quality,
    background: readEnum<OpenAIImageBackground>(
      settings.background,
      ['transparent', 'opaque', 'auto'],
      fallback.background,
    ),
    outputFormat: readEnum<OpenAIImageOutputFormat>(
      settings.outputFormat,
      ['png', 'webp', 'jpeg'],
      fallback.outputFormat,
    ),
    coloringPageSize: readEnum<'1024x1024' | '1536x1024' | '1024x1536'>(
      settings.coloringPageSize,
      ['1024x1024', '1536x1024', '1024x1536'],
      fallback.coloringPageSize,
    ),
  };
};

const readMarketingSettings = (
  settingsLike: unknown,
  fallback: MarketingSettings,
): MarketingSettings => {
  const settings = isRecord(settingsLike) ? settingsLike : {};
  const preview = isRecord(settings.preview) ? settings.preview : {};
  const mode =
    preview.mode === 'custom' || preview.mode === 'inherit-mask'
      ? preview.mode
      : fallback.preview.mode;

  return {
    slogan: readString(settings.slogan, fallback.slogan),
    preview: {
      mode,
      customSettings: readMarketingImageSettings(
        preview.customSettings,
        fallback.preview.customSettings,
      ),
    },
    additionalPrompt: readString(settings.additionalPrompt, fallback.additionalPrompt),
    maskSheetMasksPerImage: readMaskSheetMasksPerImage(
      settings.maskSheetMasksPerImage,
      fallback.maskSheetMasksPerImage,
    ),
    childrenSceneSubjectIds: readStringArray(settings.childrenSceneSubjectIds, 3),
    flatLaySceneSubjectIds: readStringArray(settings.flatLaySceneSubjectIds, 3),
  };
};

const readStringArray = (value: unknown, limit: number): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];

const readSeoCheck = (value: unknown): EtsySeoCheck | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readOptionalString(value.id);
  const label = readOptionalString(value.label);
  const group =
    value.group === 'critical' || value.group === 'warning' || value.group === 'informational'
      ? value.group
      : undefined;
  if (!id || !label || typeof value.passed !== 'boolean') {
    return undefined;
  }

  return {
    id,
    ...(group ? { group } : {}),
    label,
    passed: value.passed,
    details: readString(value.details, ''),
  };
};

const readEtsySeoAnalysis = (value: unknown): EtsySeoAnalysis | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const suggestedTitle = readOptionalString(value.suggestedTitle);
  const suggestedDescription = readOptionalString(value.suggestedDescription);
  const checks = Array.isArray(value.checks)
    ? value.checks.map(readSeoCheck).filter((check): check is EtsySeoCheck => Boolean(check))
    : [];

  if (!suggestedTitle || !suggestedDescription || checks.length === 0) {
    return undefined;
  }

  return {
    titleWordCount: readOptionalNonNegativeNumber(value.titleWordCount) ?? 0,
    firstTitleSegment: readString(value.firstTitleSegment, ''),
    tags: readStringArray(value.tags, 13),
    repeatedTitleWords: readStringArray(value.repeatedTitleWords, 50),
    suggestedTitle,
    suggestedTags: readStringArray(value.suggestedTags, 13),
    suggestedDescription,
    checks,
  };
};

const hasChangedSettings = (
  settings: ProjectSettings,
  fallbackSettings: ProjectSettings,
): boolean =>
  (Object.keys(fallbackSettings) as Array<keyof ProjectSettings>).some(
    (key) => settings[key] !== fallbackSettings[key],
  );

const readLastBriefUpdatedAt = (
  projectLike: Record<string, unknown>,
  settings: ProjectSettings,
  subjects: SubjectItem[],
  fallback: Project,
): string | undefined => {
  const explicitLastBriefUpdatedAt = readOptionalString(projectLike.lastBriefUpdatedAt);
  if (explicitLastBriefUpdatedAt) {
    return explicitLastBriefUpdatedAt;
  }

  if (subjects.length > 0 || hasChangedSettings(settings, fallback.settings)) {
    return readOptionalString(projectLike.updatedAt) ?? fallback.updatedAt;
  }

  return undefined;
};

export const normalizeProject = (projectLike: unknown, fallback: Project): Project => {
  if (!isRecord(projectLike)) {
    return fallback;
  }

  const settings = readSettings(projectLike.settings, fallback.settings);
  const subjects = removeLegacyMockSubjects(readSubjects(projectLike));
  const pdfSettings = readPdfSettings(projectLike.pdfSettings, fallback.pdfSettings);
  const openAIImageSettings = readOpenAIImageSettings(
    projectLike.openAIImageSettings ??
      projectLike.openAISettings ??
      projectLike.imageGenerationSettings,
    fallback.openAIImageSettings,
  );
  const coloringPageQuality = readEnum<OpenAIImageQuality>(
    projectLike.coloringPageQuality,
    ['low', 'medium', 'high', 'auto'],
    fallback.coloringPageQuality,
  );
  const marketingSettings = readMarketingSettings(
    projectLike.marketingSettings,
    fallback.marketingSettings,
  );

  if (hasLegacyMockTitle(settings)) {
    return {
      ...fallback,
      pdfSettings,
      openAIImageSettings,
      coloringPageQuality,
      marketingSettings,
      updatedAt: new Date().toISOString(),
    };
  }

  const optionalDates = optionalProjectDateFields.reduce<Partial<Project>>((dates, field) => {
    const value =
      field === 'lastBriefUpdatedAt'
        ? readLastBriefUpdatedAt(projectLike, settings, subjects, fallback)
        : readOptionalString(projectLike[field]);

    return value ? { ...dates, [field]: value } : dates;
  }, {});
  const nestedEtsyUploadZipSizeBytes = readOptionalNonNegativeNumber(
    projectLike.nestedEtsyUploadZipSizeBytes,
  );
  const etsySeoAnalysis = readEtsySeoAnalysis(projectLike.etsySeoAnalysis);

  return {
    id: readRequiredString(projectLike.id, fallback.id),
    settings,
    subjects,
    pdfSettings,
    openAIImageSettings,
    coloringPageQuality,
    marketingSettings,
    createdAt: readRequiredString(projectLike.createdAt, fallback.createdAt),
    updatedAt: new Date().toISOString(),
    ...optionalDates,
    ...(etsySeoAnalysis ? { etsySeoAnalysis } : {}),
    ...(nestedEtsyUploadZipSizeBytes !== undefined ? { nestedEtsyUploadZipSizeBytes } : {}),
  };
};
