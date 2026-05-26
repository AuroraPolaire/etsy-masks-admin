import { ApiError, isRecord, readJsonObject, readRequiredString } from './http';

import type { Env } from './types';

const OPENAI_BRIEF_MODEL = 'gpt-5.4-mini';
const IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'] as const;
const IMAGE_SIZES = ['1024x1024', '1536x1024', '1024x1536', 'auto'] as const;
const IMAGE_QUALITIES = ['low', 'medium', 'high', 'auto'] as const;
const IMAGE_BACKGROUNDS = ['transparent', 'opaque', 'auto'] as const;
const OUTPUT_FORMATS = ['png', 'webp', 'jpeg'] as const;

type ImageModel = (typeof IMAGE_MODELS)[number];
type ImageSize = (typeof IMAGE_SIZES)[number];
type ImageQuality = (typeof IMAGE_QUALITIES)[number];
type ImageBackground = (typeof IMAGE_BACKGROUNDS)[number];
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

type ImageSettings = {
  model: ImageModel;
  size: ImageSize;
  quality: ImageQuality;
  background: ImageBackground;
  outputFormat: OutputFormat;
};

type PromptItemInput = {
  expectedFilename: string;
  prompt: string;
  negativeRequirements: string;
};

type OpenAIImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

const getOpenAIKey = (env: Env): string => {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(503, 'OPENAI_API_KEY is not configured for this Worker.');
  }

  return apiKey;
};

const createStringSchema = (description: string) => ({
  type: 'string',
  description,
});

const seoCheckSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: createStringSchema('Stable kebab-case check id.'),
    label: createStringSchema('Short SEO check label.'),
    passed: {
      type: 'boolean',
      description: 'Whether the generated draft passes this check.',
    },
    details: createStringSchema('Concrete details about the SEO check.'),
  },
  required: ['id', 'label', 'passed', 'details'],
};

const buildBriefRequestBody = (initialPrompt: string): Record<string, unknown> => ({
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
        '- Also return AI Etsy SEO analysis for the generated title, tags, and description.',
        '- SEO suggestions must be directly usable: one improved title, exactly 13 tags with each tag 20 characters or fewer, and one improved description draft.',
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
          etsySeoAnalysis: {
            type: 'object',
            additionalProperties: false,
            properties: {
              titleWordCount: {
                type: 'number',
                description: 'Word count for the generated title.',
              },
              firstTitleSegment: createStringSchema(
                'First buyer-visible title segment, about 60 characters.',
              ),
              tags: {
                type: 'array',
                items: createStringSchema('One generated Etsy tag.'),
              },
              repeatedTitleWords: {
                type: 'array',
                items: createStringSchema('A title word repeated too often, if any.'),
              },
              suggestedTitle: createStringSchema('Improved Etsy title suggestion.'),
              suggestedTags: {
                type: 'array',
                items: createStringSchema('One improved Etsy tag, 20 characters or fewer.'),
              },
              suggestedDescription: createStringSchema('Improved Etsy description draft.'),
              checks: {
                type: 'array',
                items: seoCheckSchema,
              },
            },
            required: [
              'titleWordCount',
              'firstTitleSegment',
              'tags',
              'repeatedTitleWords',
              'suggestedTitle',
              'suggestedTags',
              'suggestedDescription',
              'checks',
            ],
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
          'etsySeoAnalysis',
        ],
      },
    },
  },
});

const readEnum = <Value extends string>(
  value: unknown,
  allowedValues: readonly Value[],
  fieldName: string,
): Value => {
  if (typeof value === 'string' && allowedValues.includes(value as Value)) {
    return value as Value;
  }

  throw new ApiError(400, `${fieldName} is invalid.`);
};

const readImageSettings = (value: unknown): ImageSettings => {
  if (!isRecord(value)) {
    throw new ApiError(400, 'settings is required.');
  }

  return {
    model: readEnum(value.model, IMAGE_MODELS, 'settings.model'),
    size: readEnum(value.size, IMAGE_SIZES, 'settings.size'),
    quality: readEnum(value.quality, IMAGE_QUALITIES, 'settings.quality'),
    background: readEnum(value.background, IMAGE_BACKGROUNDS, 'settings.background'),
    outputFormat: readEnum(value.outputFormat, OUTPUT_FORMATS, 'settings.outputFormat'),
  };
};

const readPromptItem = (value: unknown): PromptItemInput => {
  if (!isRecord(value)) {
    throw new ApiError(400, 'promptItem is required.');
  }

  return {
    expectedFilename: sanitizeFileName(
      readRequiredString(value.expectedFilename, 'promptItem.expectedFilename'),
    ),
    prompt: readRequiredString(value.prompt, 'promptItem.prompt'),
    negativeRequirements: readRequiredString(
      value.negativeRequirements,
      'promptItem.negativeRequirements',
    ),
  };
};

const sanitizeFileName = (fileName: string): string =>
  fileName
    .replace(/[/\\]/g, '-')
    .replace(/["\0\r\n]/g, '')
    .slice(0, 160)
    .trim() || 'generated-image.png';

const buildImageRequestBody = (
  settings: ImageSettings,
  promptItem: PromptItemInput,
): Record<string, string | number> => {
  const background =
    settings.model === 'gpt-image-2' && settings.background === 'transparent'
      ? 'opaque'
      : settings.background;

  return {
    model: settings.model,
    prompt: `${promptItem.prompt}\n\nNegative requirements: ${promptItem.negativeRequirements}`,
    n: 1,
    size: settings.size,
    quality: settings.quality,
    background,
    output_format: settings.outputFormat,
  };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const inferMimeType = (outputFormat: OutputFormat): string =>
  outputFormat === 'jpeg' ? 'image/jpeg' : `image/${outputFormat}`;

const readImageGenerationResponse = async (
  response: Response,
): Promise<OpenAIImageGenerationResponse> => {
  const parsed: unknown = await response.json();

  return isRecord(parsed) ? parsed : {};
};

export const proxyOpenAIBrief = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJsonObject(request);
  const initialPrompt = readRequiredString(payload.initialPrompt, 'initialPrompt');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBriefRequestBody(initialPrompt)),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
};

export const proxyOpenAIImage = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJsonObject(request);
  const settings = readImageSettings(payload.settings);
  const promptItem = readPromptItem(payload.promptItem);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildImageRequestBody(settings, promptItem)),
  });
  const result = await readImageGenerationResponse(response);

  if (!response.ok) {
    return Response.json(
      { error: result.error?.message ?? `OpenAI image generation failed: ${response.status}` },
      { status: response.status },
    );
  }

  const firstImage = result.data?.[0];
  if (!firstImage) {
    return Response.json({ error: 'OpenAI returned no image data.' }, { status: 502 });
  }

  if (firstImage.b64_json) {
    return Response.json({
      fileName: promptItem.expectedFilename,
      mimeType: inferMimeType(settings.outputFormat),
      base64: firstImage.b64_json,
    });
  }

  if (firstImage.url) {
    const imageResponse = await fetch(firstImage.url);
    if (!imageResponse.ok) {
      return Response.json(
        { error: `Could not download generated image: ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const buffer = await imageResponse.arrayBuffer();
    return Response.json({
      fileName: promptItem.expectedFilename,
      mimeType: imageResponse.headers.get('Content-Type') ?? inferMimeType(settings.outputFormat),
      base64: arrayBufferToBase64(buffer),
    });
  }

  return Response.json(
    { error: 'OpenAI returned an unsupported image response.' },
    { status: 502 },
  );
};
