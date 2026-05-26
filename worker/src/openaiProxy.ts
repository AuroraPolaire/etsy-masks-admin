import {
  ApiError,
  getMaxFileBytes,
  isBlobLike,
  isRecord,
  readJsonObject,
  readRequiredString,
} from './http';

import type { Env } from './types';

const OPENAI_BRIEF_MODEL = 'gpt-5.4-mini';
const IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'] as const;
const IMAGE_SIZES = ['1024x1024', '1536x1024', '1024x1536', 'auto'] as const;
const IMAGE_QUALITIES = ['low', 'medium', 'high', 'auto'] as const;
const IMAGE_BACKGROUNDS = ['transparent', 'opaque', 'auto'] as const;
const OUTPUT_FORMATS = ['png', 'webp', 'jpeg'] as const;
const EDIT_IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'] as const;

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

type ColoringPageInput = {
  settings: ImageSettings;
  promptItem: PromptItemInput;
  image: Blob;
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
    group: {
      type: 'string',
      enum: ['critical', 'warning', 'informational'],
      description: 'QA severity group for this AI semantic check.',
    },
    label: createStringSchema('Short SEO check label.'),
    passed: {
      type: 'boolean',
      description: 'Whether the generated draft passes this check.',
    },
    details: createStringSchema('Concrete details about the SEO check.'),
  },
  required: ['id', 'group', 'label', 'passed', 'details'],
};

const etsySeoAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    titleWordCount: {
      type: 'number',
      description: 'Word count for the reviewed title.',
    },
    firstTitleSegment: createStringSchema(
      'First buyer-visible title segment, about 60 characters.',
    ),
    tags: {
      type: 'array',
      items: createStringSchema('One reviewed Etsy tag.'),
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
        '- If the idea includes Mask style, Color painting, or Coloring page lines, preserve those choices in the returned style and generated listing direction.',
        '- Style must describe both the color mask painting treatment and how the matching black-and-white coloring page should simplify the design.',
        '- Style must specify that the mask has only eye holes and no side punch holes, string holes, strap holes, hanging holes, attachment holes, or extra circular cutouts.',
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
          etsySeoAnalysis: etsySeoAnalysisSchema,
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

const buildEtsySeoReviewRequestBody = (
  project: Record<string, unknown>,
  fileSummaries: unknown,
): Record<string, unknown> => ({
  model: OPENAI_BRIEF_MODEL,
  input: [
    {
      role: 'developer',
      content: [
        'You are an Etsy listing strategist and compliance-minded QA reviewer for printable kids paper mask bundles.',
        'Return only schema-valid JSON.',
        'Use human semantic judgment for listing quality, buyer clarity, marketplace risk, safety copy, and Etsy SEO.',
        'Do not judge objective browser facts like whether files exist, image dimensions, ZIP size, or export count. The app checks those separately.',
        'Avoid trademarked, copyrighted, celebrity, and branded topics. Prefer generic, buyer-readable language.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Review the current Etsy listing draft and return AI SEO suggestions plus semantic QA checks.',
        '',
        'Project JSON:',
        JSON.stringify(project),
        '',
        'Current file summary JSON, for context only. Do not create pass/fail checks for file existence, image dimensions, or ZIP size:',
        JSON.stringify(fileSummaries ?? []),
        '',
        'Required checks:',
        '- Include critical checks for title/topic count fit, digital-download clarity, no-physical-item clarity, kids safety clarity, under-3 warning, license/refund clarity, and trademark/IP risk.',
        '- Include warning checks for title readability, title front-loading, keyword stuffing, tag quality, tag limits, tag diversity, description buyer clarity, description structure, and natural keyword use.',
        '- Include concrete details that explain the issue or why it passes.',
        '- Suggested title must be production-ready for Etsy, product-first, and include mask count.',
        '- Suggested tags must contain exactly 13 Etsy tags, each 20 characters or fewer.',
        '- Suggested description must be buyer-ready and include contents, use cases, instructions, safety, digital download/no physical item, license, and refund copy.',
      ].join('\n'),
    },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'etsy_listing_ai_review',
      strict: true,
      schema: etsySeoAnalysisSchema,
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

const createColoringPageFileName = (fileName: string): string => {
  const sanitized = sanitizeFileName(fileName);
  const extensionIndex = sanitized.lastIndexOf('.');
  const baseName = extensionIndex > 0 ? sanitized.slice(0, extensionIndex) : sanitized;

  return `${baseName}-coloring-page.png`;
};

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

const getEditModel = (settings: ImageSettings): (typeof EDIT_IMAGE_MODELS)[number] =>
  EDIT_IMAGE_MODELS.includes(settings.model as (typeof EDIT_IMAGE_MODELS)[number])
    ? (settings.model as (typeof EDIT_IMAGE_MODELS)[number])
    : 'gpt-image-1.5';

const supportsHighInputFidelity = (model: (typeof EDIT_IMAGE_MODELS)[number]): boolean =>
  model !== 'gpt-image-1-mini';

const buildColoringPagePrompt = (promptItem: PromptItemInput): string =>
  [
    'Turn this image into a clean black and white coloring page.',
    '',
    'Style requirements:',
    '- pure white background',
    '- bold, clean black outlines',
    '- no shading, no gradients, no color',
    '- simplified shapes but keep key details',
    '- smooth vector-like lines',
    '- printable quality',
    '',
    'Remove:',
    '- textures',
    '- shadows',
    '- highlights',
    '- noise',
    '- any non-eye holes, side punch holes, string holes, strap holes, hanging holes, attachment holes, or extra circular cutouts',
    '',
    'Keep:',
    '- symmetrical composition',
    '- main decorative elements',
    '- the mask silhouette and eye holes from the source image',
    '- decorative details as printed lines only, not as punched holes',
    '',
    'Do not add text, watermark, crop marks, dashed cut guides, sticker borders, side punch holes, string holes, strap holes, hanging holes, attachment holes, extra circular cutouts, or an extra cut contour outside the mask.',
    'Make it suitable for a kids coloring activity.',
    `Original prompt context: ${promptItem.prompt}`,
  ].join('\n');

const readFormJsonObject = (formData: FormData, fieldName: string): Record<string, unknown> => {
  const rawValue = readRequiredString(formData.get(fieldName), fieldName);

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    throw new ApiError(400, `${fieldName} must be valid JSON.`);
  }

  throw new ApiError(400, `${fieldName} must be a JSON object.`);
};

const readColoringPageInput = async (request: Request, env: Env): Promise<ColoringPageInput> => {
  const formData = await request.formData();
  const image = formData.get('image');
  if (!isBlobLike(image)) {
    throw new ApiError(400, 'image form field is required.');
  }

  if (image.size > getMaxFileBytes(env)) {
    throw new ApiError(413, 'Image is larger than the configured backend limit.');
  }

  const imageType = image.type.toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(imageType)) {
    throw new ApiError(400, 'image must be a PNG, JPG, or WEBP file.');
  }

  return {
    settings: readImageSettings(readFormJsonObject(formData, 'settings')),
    promptItem: readPromptItem(readFormJsonObject(formData, 'promptItem')),
    image,
  };
};

const buildColoringPageEditFormData = ({
  settings,
  promptItem,
  image,
}: ColoringPageInput): FormData => {
  const formData = new FormData();
  const model = getEditModel(settings);

  formData.append('model', model);
  formData.append('image', image, promptItem.expectedFilename);
  formData.append('prompt', buildColoringPagePrompt(promptItem));
  formData.append('n', '1');
  formData.append('size', settings.size);
  formData.append('quality', settings.quality);
  formData.append('background', 'opaque');
  formData.append('output_format', 'png');
  if (supportsHighInputFidelity(model)) {
    formData.append('input_fidelity', 'high');
  }

  return formData;
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

export const proxyOpenAIEtsySeoReview = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJsonObject(request);
  const project = payload.project;
  if (!isRecord(project)) {
    throw new ApiError(400, 'project is required.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEtsySeoReviewRequestBody(project, payload.files)),
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

export const proxyOpenAIColoringPageImage = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const input = await readColoringPageInput(request, env);
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
    },
    body: buildColoringPageEditFormData(input),
  });
  const result = await readImageGenerationResponse(response);

  if (!response.ok) {
    return Response.json(
      { error: result.error?.message ?? `OpenAI image edit failed: ${response.status}` },
      { status: response.status },
    );
  }

  const firstImage = result.data?.[0];
  const fileName = createColoringPageFileName(input.promptItem.expectedFilename);
  if (!firstImage) {
    return Response.json(
      { error: 'OpenAI returned no coloring page image data.' },
      { status: 502 },
    );
  }

  if (firstImage.b64_json) {
    return Response.json({
      fileName,
      mimeType: 'image/png',
      base64: firstImage.b64_json,
    });
  }

  if (firstImage.url) {
    const imageResponse = await fetch(firstImage.url);
    if (!imageResponse.ok) {
      return Response.json(
        { error: `Could not download generated coloring page: ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const buffer = await imageResponse.arrayBuffer();
    return Response.json({
      fileName,
      mimeType: imageResponse.headers.get('Content-Type') ?? 'image/png',
      base64: arrayBufferToBase64(buffer),
    });
  }

  return Response.json(
    { error: 'OpenAI returned an unsupported coloring page image response.' },
    { status: 502 },
  );
};
