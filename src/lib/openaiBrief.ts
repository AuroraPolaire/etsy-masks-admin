import { DRAFT_TEMPLATE_SETTINGS } from '../constants';

import type { EtsySeoAnalysis, EtsySeoCheck, ProjectDraft } from '../types';

export type OpenAIResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const stringField = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const stringArrayField = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
    : [];

const numberField = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const normalizeSeoCheck = (value: unknown): EtsySeoCheck | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = stringField(value.id, '');
  const label = stringField(value.label, '');
  if (!id || !label || typeof value.passed !== 'boolean') {
    return undefined;
  }

  return {
    id,
    label,
    passed: value.passed,
    details: stringField(value.details, ''),
  };
};

const normalizeSeoAnalysis = (value: unknown): EtsySeoAnalysis | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const suggestedTitle = stringField(value.suggestedTitle, '');
  const suggestedDescription = stringField(value.suggestedDescription, '');
  const checks = Array.isArray(value.checks)
    ? value.checks.map(normalizeSeoCheck).filter((check): check is EtsySeoCheck => Boolean(check))
    : [];

  if (!suggestedTitle || !suggestedDescription || checks.length === 0) {
    return undefined;
  }

  return {
    titleWordCount: numberField(value.titleWordCount, 0),
    firstTitleSegment: stringField(value.firstTitleSegment, ''),
    tags: stringArrayField(value.tags).filter(Boolean).slice(0, 13),
    repeatedTitleWords: stringArrayField(value.repeatedTitleWords).filter(Boolean).slice(0, 50),
    suggestedTitle,
    suggestedTags: stringArrayField(value.suggestedTags).filter(Boolean).slice(0, 13),
    suggestedDescription,
    checks,
  };
};

const getResponseText = (response: OpenAIResponsesApiResponse): string => {
  if (response.output_text) {
    return response.output_text;
  }

  const textFromOutput = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === 'string' && text.trim().length > 0);

  if (textFromOutput) {
    return textFromOutput;
  }

  throw new Error('OpenAI returned no project brief text.');
};

export const normalizeAiProjectDraft = (rawValue: unknown): ProjectDraft => {
  if (!isRecord(rawValue)) {
    throw new Error('OpenAI project brief was not valid JSON.');
  }

  const subjects = stringArrayField(rawValue.subjects)
    .filter((subject) => subject.length > 0)
    .slice(0, 24);
  const tags = stringArrayField(rawValue.tags)
    .filter((tag) => tag.length > 0)
    .slice(0, 13);
  const marketplace = rawValue.marketplace === 'Other' ? 'Other' : 'Etsy';

  if (subjects.length === 0) {
    throw new Error('OpenAI project brief did not include any mask topics.');
  }

  const etsySeoAnalysis = normalizeSeoAnalysis(rawValue.etsySeoAnalysis ?? rawValue.seoAnalysis);

  return {
    settings: {
      ...DRAFT_TEMPLATE_SETTINGS,
      title: stringField(rawValue.title, DRAFT_TEMPLATE_SETTINGS.title),
      theme: stringField(rawValue.theme, DRAFT_TEMPLATE_SETTINGS.theme),
      audience: stringField(rawValue.audience, DRAFT_TEMPLATE_SETTINGS.audience),
      marketplace,
      style: stringField(rawValue.style, DRAFT_TEMPLATE_SETTINGS.style),
      description: stringField(rawValue.description, DRAFT_TEMPLATE_SETTINGS.description),
      tags: tags.length > 0 ? tags.join(', ') : DRAFT_TEMPLATE_SETTINGS.tags,
      safetyNote: stringField(rawValue.safetyNote, DRAFT_TEMPLATE_SETTINGS.safetyNote),
      printingInstructions: stringField(
        rawValue.printingInstructions,
        DRAFT_TEMPLATE_SETTINGS.printingInstructions,
      ),
      license: stringField(rawValue.license, DRAFT_TEMPLATE_SETTINGS.license),
      refundPolicy: stringField(rawValue.refundPolicy, DRAFT_TEMPLATE_SETTINGS.refundPolicy),
    },
    subjects: subjects.map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
    ...(etsySeoAnalysis ? { etsySeoAnalysis } : {}),
  };
};

export const parseOpenAIProjectBriefResponse = (
  response: OpenAIResponsesApiResponse,
): ProjectDraft => {
  const responseText = getResponseText(response);
  return normalizeAiProjectDraft(JSON.parse(responseText) as unknown);
};
