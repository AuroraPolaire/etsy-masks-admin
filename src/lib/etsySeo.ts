import type { EtsySeoAnalysis, EtsySeoCheck, Project } from '../types';

const TITLE_WORD_LIMIT = 14;
const TITLE_VISIBLE_CHAR_LIMIT = 60;
const MAX_TAGS = 13;
const MAX_TAG_LENGTH = 20;
const DESCRIPTION_MIN_WORDS = 90;
const DESCRIPTION_MAX_WORDS = 360;
const TITLE_STOP_WORDS = new Set(['a', 'an', 'and', 'for', 'of', 'or', 'the', 'to', 'with']);

const normalizeSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

const titleCase = (value: string): string =>
  normalizeSpaces(value)
    .split(' ')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');

const getTitleWords = (title: string): string[] =>
  normalizeSpaces(title).split(/\s+/).filter(Boolean);

const sanitizeTag = (value: string): string =>
  normalizeSpaces(value)
    .toLowerCase()
    .replace(/[^a-z0-9 '-]/g, '')
    .replace(/^['-]+/g, '')
    .trim();

export const parseEtsyTags = (tags: string): string[] =>
  tags
    .split(',')
    .map((tag) => normalizeSpaces(tag))
    .filter(Boolean);

export const getRepeatedTitleWords = (title: string): string[] => {
  const counts = new Map<string, number>();

  getTitleWords(title).forEach((word) => {
    const normalizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normalizedWord || TITLE_STOP_WORDS.has(normalizedWord)) {
      return;
    }

    counts.set(normalizedWord, (counts.get(normalizedWord) ?? 0) + 1);
  });

  return [...counts.entries()].filter(([, count]) => count > 3).map(([word]) => word);
};

const getThemeKeyword = (theme: string): string => {
  const cleanedTheme = normalizeSpaces(
    theme
      .replace(/\b(printable|paper|mask|masks|bundle|kids|children|for)\b/gi, ' ')
      .replace(/[^a-z0-9 ]/gi, ' '),
  );

  const themeWords = cleanedTheme.split(' ').filter(Boolean).slice(0, 3);
  return themeWords.length > 0 ? titleCase(themeWords.join(' ')) : 'Kids';
};

const addUniqueTag = (tags: string[], value: string): void => {
  const tag = sanitizeTag(value);
  if (!tag || tag.length > MAX_TAG_LENGTH || tags.includes(tag)) {
    return;
  }

  tags.push(tag);
};

export const createOptimizedEtsyTitle = (project: Project): string => {
  const themeKeyword = getThemeKeyword(project.settings.theme);
  const title = `${themeKeyword} Printable Masks, ${project.subjects.length} Kids Paper Masks, Party Craft`;
  const words = getTitleWords(title);

  if (words.length <= TITLE_WORD_LIMIT) {
    return title;
  }

  return `${themeKeyword} Masks, ${project.subjects.length} Kids Paper Masks, Party Craft`;
};

export const createOptimizedEtsyTags = (project: Project): string[] => {
  const themeKeyword = getThemeKeyword(project.settings.theme).toLowerCase();
  const tags: string[] = [];

  [
    `${themeKeyword} masks`,
    `${themeKeyword.split(' ')[0] ?? themeKeyword} masks`,
    'printable masks',
    'kids masks',
    'paper masks',
    'party masks',
  ].forEach((tag) => addUniqueTag(tags, tag));

  project.subjects.forEach((subject) => {
    addUniqueTag(tags, `${subject.name} mask`);
  });

  [
    'classroom craft',
    'digital download',
    'kids activity',
    'pretend play',
    'costume craft',
    'birthday party',
    'teacher resources',
    'diy masks',
    'pdf masks',
    'party printable',
  ].forEach((tag) => addUniqueTag(tags, tag));

  return tags.slice(0, MAX_TAGS);
};

const createSeoCheck = (
  id: string,
  label: string,
  passed: boolean,
  details: string,
): EtsySeoCheck => ({
  id,
  label,
  passed,
  details,
});

const firstSentence = (description: string): string => description.split(/[.!?]/)[0]?.trim() ?? '';

const countWords = (value: string): number =>
  normalizeSpaces(value).split(/\s+/).filter(Boolean).length;

const createIncludedItems = (project: Project): string[] =>
  [
    `${project.subjects.length} printable mask designs`,
    'PNG mask files',
    project.pdfSettings.generateA4 ? 'A4 printable PDF' : '',
    project.pdfSettings.generateUSLetter ? 'US Letter printable PDF' : '',
    'printing and cutting instructions',
  ].filter(Boolean);

export const createOptimizedEtsyDescription = (project: Project): string => {
  const theme = normalizeSpaces(project.settings.theme).toLowerCase();
  const subjectList = project.subjects.map((subject) => subject.name).join(', ');
  const includedItems = createIncludedItems(project)
    .map((item) => `- ${item}`)
    .join('\n');
  const firstTagPhrases = createOptimizedEtsyTags(project).slice(0, 5).join(', ');

  return [
    `${project.settings.title} is a printable digital download for kids parties, classroom crafts, pretend play, storytelling, and DIY costume activities.`,
    '',
    `This ${theme} bundle includes ${project.subjects.length} ready-to-print paper mask designs: ${subjectList}. Each design is prepared as a printable craft file with clear eye holes for simple home or classroom printing.`,
    '',
    'What is included:',
    includedItems,
    '',
    'How to use:',
    '- Download the files after purchase',
    '- Print at 100% scale on cardstock or thick paper',
    '- Cut around the mask and carefully cut out the eye holes',
    '- Use with adult supervision',
    '',
    'Best for:',
    '- birthday party activities',
    '- classroom crafts',
    '- teacher resources',
    '- pretend play',
    '- storytelling and costume corners',
    '',
    `Search phrases covered naturally: ${firstTagPhrases}.`,
    '',
    'Important:',
    project.settings.safetyNote,
    '',
    'Digital download only. No physical item will be shipped.',
    '',
    'License:',
    project.settings.license,
    '',
    'Refund policy:',
    project.settings.refundPolicy,
  ].join('\n');
};

export const analyzeEtsySeo = (project: Project): EtsySeoAnalysis => {
  const title = normalizeSpaces(project.settings.title);
  const titleWords = getTitleWords(title);
  const firstTitleSegment = title.slice(0, TITLE_VISIBLE_CHAR_LIMIT);
  const tags = parseEtsyTags(project.settings.tags);
  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  const repeatedTitleWords = getRepeatedTitleWords(title);
  const duplicateTagCount = normalizedTags.length - new Set(normalizedTags).size;
  const overlongTags = tags.filter((tag) => tag.length > MAX_TAG_LENGTH);
  const descriptionLead = firstSentence(project.settings.description);
  const descriptionWordCount = countWords(project.settings.description);
  const descriptionHasSections = ['what is included', 'how to use', 'important'].every((section) =>
    project.settings.description.toLowerCase().includes(section),
  );
  const descriptionHasTagsNaturally = parseEtsyTags(project.settings.tags)
    .slice(0, 5)
    .some((tag) => project.settings.description.toLowerCase().includes(tag.toLowerCase()));
  const firstSegmentIncludesMask =
    /mask/i.test(firstTitleSegment) && /printable|paper|kids|bundle/i.test(firstTitleSegment);

  const checks = [
    createSeoCheck(
      'title-word-count',
      'Title is concise',
      titleWords.length > 0 && titleWords.length <= TITLE_WORD_LIMIT,
      `${titleWords.length} words. Keep Etsy titles under 15 words when possible.`,
    ),
    createSeoCheck(
      'title-front-loaded',
      'Title starts with the product',
      firstSegmentIncludesMask,
      `First ${TITLE_VISIBLE_CHAR_LIMIT} characters: ${firstTitleSegment || 'empty title'}.`,
    ),
    createSeoCheck(
      'title-readable',
      'Title avoids keyword stuffing',
      repeatedTitleWords.length === 0,
      repeatedTitleWords.length
        ? `Repeated too often: ${repeatedTitleWords.join(', ')}.`
        : 'No excessive repeated words found.',
    ),
    createSeoCheck(
      'tags-count',
      'Uses all 13 Etsy tags',
      tags.length === MAX_TAGS,
      `${tags.length} of ${MAX_TAGS} tags used.`,
    ),
    createSeoCheck(
      'tags-length',
      'Tags fit Etsy limits',
      overlongTags.length === 0,
      overlongTags.length
        ? `Over 20 characters: ${overlongTags.join(', ')}.`
        : 'All tags are 20 characters or fewer.',
    ),
    createSeoCheck(
      'tags-diverse',
      'Tags are diverse',
      duplicateTagCount === 0,
      duplicateTagCount > 0
        ? `${duplicateTagCount} duplicate tag${duplicateTagCount === 1 ? '' : 's'} found.`
        : 'No duplicate tags found.',
    ),
    createSeoCheck(
      'description-lead',
      'Description opens clearly',
      /printable/i.test(descriptionLead) &&
        /mask/i.test(descriptionLead) &&
        /digital download|download/i.test(project.settings.description),
      descriptionLead || 'Description needs a clear opening sentence.',
    ),
    createSeoCheck(
      'description-depth',
      'Description has enough detail',
      descriptionWordCount >= DESCRIPTION_MIN_WORDS &&
        descriptionWordCount <= DESCRIPTION_MAX_WORDS,
      `${descriptionWordCount} words. Aim for ${DESCRIPTION_MIN_WORDS}-${DESCRIPTION_MAX_WORDS} useful words.`,
    ),
    createSeoCheck(
      'description-structure',
      'Description is easy to scan',
      descriptionHasSections,
      descriptionHasSections
        ? 'Includes clear sections for contents, use, and important notes.'
        : 'Add sections for contents, use, and important notes.',
    ),
    createSeoCheck(
      'description-keywords',
      'Description uses tag phrases naturally',
      descriptionHasTagsNaturally,
      descriptionHasTagsNaturally
        ? 'A leading tag phrase appears naturally in the description.'
        : 'Use a few important tag phrases in natural sentences.',
    ),
  ];

  return {
    titleWordCount: titleWords.length,
    firstTitleSegment,
    tags,
    repeatedTitleWords,
    suggestedTitle: createOptimizedEtsyTitle(project),
    suggestedTags: createOptimizedEtsyTags(project),
    suggestedDescription: createOptimizedEtsyDescription(project),
    checks,
  };
};
