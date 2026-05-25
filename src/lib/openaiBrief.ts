import { DRAFT_TEMPLATE_SETTINGS, OPENAI_BRIEF_MODEL } from '../constants';

import type { ProjectDraft } from '../types';

type OpenAIProjectBriefSettings = {
  apiKey: string;
  initialPrompt: string;
  signal?: AbortSignal;
};

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

const createStringSchema = (description: string) => ({
  type: 'string',
  description,
});

export const buildOpenAIProjectBriefRequestBody = (
  initialPrompt: string,
): Record<string, unknown> => ({
  model: OPENAI_BRIEF_MODEL,
  input: [
    {
      role: 'developer',
      content:
        'You are an Etsy listing strategist for printable kids paper mask bundles. Return only schema-valid JSON. Avoid trademarked, copyrighted, celebrity, and branded topics. Write buyer-readable English copy.',
    },
    {
      role: 'user',
      content: [
        'Create a production-ready project brief for a static Etsy mask bundle admin app.',
        `Initial bundle idea: ${initialPrompt.trim() || 'Printable party masks for kids'}`,
        'Requirements:',
        '- Topic list can include any safe mask topic, not only animals.',
        '- Title must be concise, product-first, under 15 words if possible, and include the mask count.',
        '- Tags must be exactly 13 Etsy tags, diverse, comma-ready, and each 20 characters or fewer.',
        '- Description must be structured with clear buyer benefits, included files, how to use, safety, digital download disclaimer, license, and refund policy.',
        '- Style should guide image generation for realistic/front-view printable masks unless the idea asks for another style.',
        '- Safety note must mention adult supervision and not intended for children under 3.',
      ].join('\n'),
    },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'etsy_mask_project_brief',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: createStringSchema('Concise Etsy listing title with mask count.'),
          theme: createStringSchema('Short theme name for the bundle.'),
          audience: createStringSchema('Target buyer or user audience.'),
          marketplace: {
            type: 'string',
            enum: ['Etsy', 'Other'],
          },
          style: createStringSchema('Image generation style for all mask prompts.'),
          description: createStringSchema('Structured Etsy product description.'),
          tags: {
            type: 'array',
            items: createStringSchema('One Etsy tag, 20 characters or fewer.'),
          },
          safetyNote: createStringSchema('Safety note with adult supervision and under 3 warning.'),
          printingInstructions: createStringSchema('Practical printing and cutting instructions.'),
          license: createStringSchema('Digital file license terms.'),
          refundPolicy: createStringSchema('Digital product refund policy.'),
          subjects: {
            type: 'array',
            items: createStringSchema('One safe mask topic name.'),
          },
        },
        required: [
          'title',
          'theme',
          'audience',
          'marketplace',
          'style',
          'description',
          'tags',
          'safetyNote',
          'printingInstructions',
          'license',
          'refundPolicy',
          'subjects',
        ],
      },
    },
  },
});

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
  };
};

export const parseOpenAIProjectBriefResponse = (
  response: OpenAIResponsesApiResponse,
): ProjectDraft => {
  const responseText = getResponseText(response);
  return normalizeAiProjectDraft(JSON.parse(responseText) as unknown);
};

export const generateProjectDraftWithOpenAI = async ({
  apiKey,
  initialPrompt,
  signal,
}: OpenAIProjectBriefSettings): Promise<ProjectDraft> => {
  if (!apiKey.trim()) {
    throw new Error('Paste an OpenAI API key before using AI brief generation.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    ...(signal ? { signal } : {}),
    body: JSON.stringify(buildOpenAIProjectBriefRequestBody(initialPrompt)),
  });
  const result = (await response.json()) as OpenAIResponsesApiResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? `OpenAI brief generation failed: ${response.status}`);
  }

  return parseOpenAIProjectBriefResponse(result);
};
