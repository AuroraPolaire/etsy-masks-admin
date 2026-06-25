import {
  ApiError,
  getMaxFileBytes,
  isBlobLike,
  isRecord,
  readJsonObject,
  readOptionalString,
  readRequiredString,
} from './http';

import type { Env } from './types';

const OPENAI_BRIEF_MODEL = 'gpt-5.4-mini';
const IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'] as const;
const IMAGE_SIZES = [
  '512x512',
  '1024x1024',
  '1536x1536',
  '1536x1024',
  '1024x1536',
  '1536x1536',
  '2048x2048',
  '2048x1152',
  '1152x2048',
  'auto',
] as const;
const IMAGE_QUALITIES = ['low', 'medium', 'high', 'auto'] as const;
const IMAGE_BACKGROUNDS = ['transparent', 'opaque', 'auto'] as const;
const OUTPUT_FORMATS = ['png', 'webp', 'jpeg'] as const;
const EDIT_IMAGE_MODELS = ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'] as const;
const MARKETING_EDIT_IMAGE_MODELS = [
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
] as const;
const MARKETING_ASSET_TYPES = [
  'slogan-poster',
  'mask-sheet',
  'children-scene',
  'printer-scene',
  'flat-lay-scene',
] as const;
const MARKETING_ASSET_STAGES = ['preview', 'final'] as const;
const MAX_BRIEF_REFERENCE_IMAGES = 3;
const MAX_BRIEF_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageModel = (typeof IMAGE_MODELS)[number];
type ImageSize = (typeof IMAGE_SIZES)[number];
type ImageQuality = (typeof IMAGE_QUALITIES)[number];
type ImageBackground = (typeof IMAGE_BACKGROUNDS)[number];
type OutputFormat = (typeof OUTPUT_FORMATS)[number];
type MarketingAssetType = (typeof MARKETING_ASSET_TYPES)[number];
type MarketingAssetStage = (typeof MARKETING_ASSET_STAGES)[number];

const normalizeOpenAIRequestSize = (size: ImageSize): ImageSize => {
  if (size === '512x512') {
    return '1024x1024';
  }

  return size;
};

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
  coloringPagePrompt?: string;
  negativeRequirements: string;
};

type ColoringPageInput = {
  settings: ImageSettings;
  promptItem: PromptItemInput;
  image: Blob;
};

type MarketingSceneInput = {
  settings: ImageSettings;
  project: {
    theme: string;
    title: string;
    audience: string;
    style: string;
    slogan: string;
  };
  recipe: {
    type: MarketingAssetType;
    id: string;
    optionIndex: number;
    stage: MarketingAssetStage;
    maskCount: number;
    customPrompt?: string;
    pageIndex?: number;
    pageCount?: number;
  };
  images: Blob[];
};

type BriefReferenceImageInput = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
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

const readBriefReferenceImages = (value: unknown): BriefReferenceImageInput[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, 'referenceImages must be an array.');
  }

  if (value.length > MAX_BRIEF_REFERENCE_IMAGES) {
    throw new ApiError(400, `Use up to ${MAX_BRIEF_REFERENCE_IMAGES} reference images.`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new ApiError(400, `referenceImages[${index}] must be an object.`);
    }

    const name = readRequiredString(item.name, `referenceImages[${index}].name`);
    const mimeType = readRequiredString(item.mimeType, `referenceImages[${index}].mimeType`);
    const dataUrl = readRequiredString(item.dataUrl, `referenceImages[${index}].dataUrl`);
    const size = typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : 0;

    if (!mimeType.startsWith('image/')) {
      throw new ApiError(400, `referenceImages[${index}].mimeType must be an image type.`);
    }

    if (!dataUrl.startsWith('data:image/')) {
      throw new ApiError(400, `referenceImages[${index}].dataUrl must be an image data URL.`);
    }

    if (size > MAX_BRIEF_REFERENCE_IMAGE_BYTES) {
      throw new ApiError(
        400,
        `referenceImages[${index}].size must be ${MAX_BRIEF_REFERENCE_IMAGE_BYTES} bytes or smaller.`,
      );
    }

    return {
      name,
      mimeType,
      size,
      dataUrl,
    };
  });
};

const buildBriefRequestBody = (
  initialPrompt: string,
  referenceImages: BriefReferenceImageInput[],
): Record<string, unknown> => {
  const referenceImageSummary = referenceImages
    .map((image, index) => `${index + 1}. ${image.name}`)
    .join('; ');
  const promptText = [
    'Create a production-ready project brief for a static Etsy mask bundle admin app.',
    `Initial bundle idea: ${
      initialPrompt.trim() ||
      'Use the attached image context to infer a safe printable kids mask bundle.'
    }`,
    referenceImages.length > 0
      ? `Attached reference images: ${referenceImageSummary}. Use them for theme, style, colors, and subject inspiration. Do not copy protected characters, logos, celebrities, or brands.`
      : '',
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
  ]
    .filter(Boolean)
    .join('\n');

  return {
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
          {
            type: 'input_text',
            text: promptText,
          },
          ...referenceImages.map((image) => ({
            type: 'input_image',
            image_url: image.dataUrl,
            detail: 'low',
          })),
        ],
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
            safetyNote: createStringSchema(
              'Safety note with adult supervision and under 3 warning.',
            ),
            printingInstructions: createStringSchema(
              'Practical printing and cutting instructions.',
            ),
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
  };
};

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

const readMarketingImageSettings = (value: unknown): ImageSettings => {
  const settings = readImageSettings(value);

  return {
    ...settings,
    quality: settings.quality === 'high' ? 'medium' : settings.quality,
    background:
      settings.model === 'gpt-image-2' && settings.background === 'transparent'
        ? 'opaque'
        : settings.background,
  };
};

const readPromptItem = (value: unknown): PromptItemInput => {
  if (!isRecord(value)) {
    throw new ApiError(400, 'promptItem is required.');
  }

  const coloringPagePrompt = readOptionalString(value.coloringPagePrompt);

  return {
    expectedFilename: sanitizeFileName(
      readRequiredString(value.expectedFilename, 'promptItem.expectedFilename'),
    ),
    prompt: readRequiredString(value.prompt, 'promptItem.prompt'),
    ...(coloringPagePrompt ? { coloringPagePrompt } : {}),
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

export const buildImageRequestBody = (
  settings: ImageSettings,
  promptItem: PromptItemInput,
): Record<string, string | number> => {
  const background =
    settings.model === 'gpt-image-2' && settings.background === 'transparent'
      ? 'opaque'
      : settings.background;

  return {
    model: settings.model,
    prompt: [
      promptItem.prompt,
      '',
      'Output requirements: generate exactly one color mask image. Do not include a black-and-white coloring page, line-art duplicate, split layout, before-and-after comparison, or any second mask.',
      '',
      `Negative requirements: ${promptItem.negativeRequirements}`,
    ].join('\n'),
    n: 1,
    size: normalizeOpenAIRequestSize(settings.size),
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

export const buildColoringPagePrompt = (promptItem: PromptItemInput): string =>
  [
    ...(promptItem.coloringPagePrompt
      ? ['Separate coloring-page prompt:', promptItem.coloringPagePrompt, '']
      : []),
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
    'Output only the coloring page; do not include the original color mask beside it.',
    'Make it suitable for a kids coloring activity.',
    `Color mask prompt context: ${promptItem.prompt}`,
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

const readMarketingSceneInput = async (
  request: Request,
  env: Env,
): Promise<MarketingSceneInput> => {
  const formData = await request.formData();
  const images = (formData.getAll('image') as unknown[]).filter((image): image is Blob =>
    isBlobLike(image),
  );
  const projectJson = readFormJsonObject(formData, 'project');
  const recipeJson = readFormJsonObject(formData, 'recipe');
  const recipeType = readEnum(recipeJson.type, MARKETING_ASSET_TYPES, 'recipe.type');

  for (const image of images) {
    if (image.size > getMaxFileBytes(env)) {
      throw new ApiError(413, 'Image is larger than the configured backend limit.');
    }

    const imageType = image.type.toLowerCase();
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(imageType)) {
      throw new ApiError(400, 'Every image must be a PNG, JPG, or WEBP file.');
    }
  }

  if (images.length === 0 && recipeType !== 'slogan-poster') {
    throw new ApiError(400, 'At least one image form field is required.');
  }

  const stage = readEnum(recipeJson.stage, MARKETING_ASSET_STAGES, 'recipe.stage');
  const pageIndex =
    typeof recipeJson.pageIndex === 'number' && Number.isFinite(recipeJson.pageIndex)
      ? Math.max(0, Math.floor(recipeJson.pageIndex))
      : undefined;
  const pageCount =
    typeof recipeJson.pageCount === 'number' && Number.isFinite(recipeJson.pageCount)
      ? Math.max(1, Math.floor(recipeJson.pageCount))
      : undefined;
  const customPrompt =
    typeof recipeJson.customPrompt === 'string' && recipeJson.customPrompt.trim()
      ? recipeJson.customPrompt.trim()
      : undefined;

  return {
    settings: readMarketingImageSettings(readFormJsonObject(formData, 'settings')),
    project: {
      theme: readRequiredString(projectJson.theme, 'project.theme'),
      title: readRequiredString(projectJson.title, 'project.title'),
      audience: readRequiredString(projectJson.audience, 'project.audience'),
      style: readRequiredString(projectJson.style, 'project.style'),
      slogan: readRequiredString(projectJson.slogan, 'project.slogan'),
    },
    recipe: {
      type: recipeType,
      id: readRequiredString(recipeJson.id, 'recipe.id'),
      optionIndex:
        typeof recipeJson.optionIndex === 'number' && Number.isFinite(recipeJson.optionIndex)
          ? Math.max(0, Math.floor(recipeJson.optionIndex))
          : 0,
      stage,
      maskCount:
        typeof recipeJson.maskCount === 'number' && Number.isFinite(recipeJson.maskCount)
          ? Math.max(recipeType === 'slogan-poster' ? 0 : 1, Math.floor(recipeJson.maskCount))
          : images.length,
      ...(customPrompt ? { customPrompt } : {}),
      ...(pageIndex !== undefined ? { pageIndex } : {}),
      ...(pageCount !== undefined ? { pageCount } : {}),
    },
    images,
  };
};

export const buildColoringPageEditFormData = ({
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
  formData.append('size', normalizeOpenAIRequestSize(settings.size));
  formData.append('quality', settings.quality);
  formData.append('background', 'opaque');
  formData.append('output_format', 'png');
  if (supportsHighInputFidelity(model)) {
    formData.append('input_fidelity', 'high');
  }

  return formData;
};

const getMarketingEditModel = (
  settings: ImageSettings,
): (typeof MARKETING_EDIT_IMAGE_MODELS)[number] =>
  MARKETING_EDIT_IMAGE_MODELS.includes(settings.model) ? settings.model : 'gpt-image-2';

const SLOGAN_VARIANT_DIRECTIONS = [
  'Variant style: bold centered typography with generous margins.',
  'Variant style: editorial typography with strong contrast and careful line breaks.',
  'Variant style: playful premium lettering with balanced spacing.',
  'Variant style: bright print-at-home value poster with large readable typography.',
  'Variant style: catalog-cover typography with a clean marketplace-ready layout.',
  'Variant style: social-ready square typographic poster with high readability.',
];

const CHILDREN_SCENE_VARIANT_DIRECTIONS = [
  'Variant style: party table scene.',
  'Variant style: classroom craft scene.',
  'Variant style: cozy play-corner scene.',
  'Variant style: bright home printer craft table scene with finished paper masks nearby.',
  'Variant style: birthday photo-booth corner with handmade printable masks worn by children.',
  'Variant style: teacher resource activity scene with children holding or wearing paper masks.',
];

const getMarketingVariantDirection = ({ recipe }: MarketingSceneInput): string => {
  if (recipe.type === 'slogan-poster') {
    return [
      'Asset type: slogan poster.',
      'Create a polished text-only Etsy listing poster.',
      'The exact slogan must be the only visible text.',
      'Do not include masks, product images, characters, icons, logos, labels, watermarks, or supporting copy.',
      'Use typography, color, spacing, and layout only. Keep every word fully visible.',
      'Wrap and scale the slogan so it fits comfortably inside the image with clear margins and no cropped letters.',
      SLOGAN_VARIANT_DIRECTIONS[recipe.optionIndex % SLOGAN_VARIANT_DIRECTIONS.length],
    ].join('\n');
  }

  if (recipe.type === 'mask-sheet') {
    return [
      'Asset type: mask sheet.',
      `Create an attractive marketplace mask sheet containing all ${recipe.maskCount} provided mask references for this page.`,
      'Use AI to choose spacing, sizing, visual rhythm, and product placement.',
      'Each mask should remain clearly visible, front-facing, and separated enough for buyer review.',
      'Use a pure white background.',
      'Avoid a boring rigid spreadsheet look; use a polished catalog or product-board layout.',
      recipe.pageCount && recipe.pageCount > 1
        ? `This is page ${(recipe.pageIndex ?? 0) + 1} of ${recipe.pageCount}; do not imply masks from other pages are included.`
        : 'This is the full mask sheet.',
      'Do not add text, titles, labels, page numbers, logos, or watermarks.',
    ].join('\n');
  }

  return [
    'Asset type: children scene.',
    `Create ${recipe.maskCount} fully clothed fictional children in a thematic party, classroom, or play setting.`,
    'Use AI to place the provided mask references naturally on the children faces.',
    'The masks should clearly look like printable paper masks made from A4 paper or light cardstock: flat cutout surface, matte printed texture, slight paper thickness, visible cut edges, eye holes, and optional elastic or string.',
    'The masks should look worn in the scene, correctly scaled, centered, and aligned to the faces while still reading as flat paper craft masks.',
    'Keep the composition warm, child-safe, and useful as an Etsy listing preview.',
    CHILDREN_SCENE_VARIANT_DIRECTIONS[
      recipe.optionIndex % CHILDREN_SCENE_VARIANT_DIRECTIONS.length
    ],
    'Do not render masks as molded plastic, rubber, plush fabric, helmets, face paint, makeup, AR filters, or realistic animal heads.',
    'Do not add text, logos, watermarks, brand characters, celebrities, unsafe behavior, scary expressions, or distorted faces.',
  ].join('\n');
};

const buildPrinterScenePrompt = (input: MarketingSceneInput): string =>
  [
    'A bright, airy craft scene on a pale wood desk bathed in soft natural morning light.',
    'At the center, a white inkjet printer is mid-print, sliding out a sheet of paper showing the provided mask reference.',
    "To the left, a clear glass vase holds pink peonies and baby's breath.",
    'Nearby sit a roll of gold glitter washi tape, folded pink and gold craft paper, and envelopes.',
    'In the foreground, three colored pencils (pink, gold, brown) rest on the desk, with white lilac blossoms and green leaves scattered around.',
    'In the soft-focus background, a white bookshelf with pastel books, a framed pink floral print, a gold cup of pencils, and potted greenery.',
    'Warm, cozy, feminine aesthetic, pastel color palette, shallow depth of field, dreamy and elegant lifestyle product photography, high detail, realistic.',
    'Use the provided mask reference image exactly as it appears on the printed paper — preserve the design, colors, and all details at 100% fidelity. Do not alter, simplify, or reinterpret the mask design.',
    `Generation variant id: ${input.recipe.id}, option ${input.recipe.optionIndex + 1}, ${input.recipe.stage}.`,
  ].join('\n');

const buildFlatLayScenePrompt = (input: MarketingSceneInput): string => {
  const maskCount = input.images.length;
  const maskLines = Array.from({ length: Math.max(maskCount, 3) }, (_, i) => {
    const position =
      i === 0 ? 'upper left' : i === 1 ? 'upper right' : 'centered at the bottom, largest';
    const ref =
      i < maskCount
        ? `use provided mask reference image ${i + 1} exactly at 100% fidelity`
        : 'use a neutral placeholder mask';
    return `The mask at ${position}: ${ref}.`;
  });

  const orientationNote = input.recipe.customPrompt
    ? `Orientation guidance — ${input.recipe.customPrompt}.`
    : '';

  return [
    'A top-down flat-lay craft scene on a pale wood desk in soft natural light.',
    `${maskCount === 3 ? 'Three' : maskCount === 2 ? 'Two' : 'One'} printed mask sheets are arranged across the surface, each a detailed semi-realistic illustration with large eye cutouts.`,
    ...maskLines,
    orientationNote,
    'Surrounding the masks are crafting supplies: gold-handled scissors, sheets of gem and star foil stickers in pink, purple, gold, and green, a white cup of colored pencils, loose pink and green pencils, rolls of pink and gold glitter washi tape, and a small potted green plant in the corner.',
    'Warm, cheerful, feminine aesthetic, pastel and jewel-tone palette, soft shadows, dreamy elegant lifestyle product photography, high detail, realistic.',
    'All mask designs must be reproduced exactly as provided — 100% fidelity, no alterations, simplifications, or reinterpretations.',
    `Generation variant id: ${input.recipe.id}, option ${input.recipe.optionIndex + 1}, ${input.recipe.stage}.`,
  ]
    .filter(Boolean)
    .join('\n');
};

const buildMarketingScenePrompt = (input: MarketingSceneInput): string => {
  if (input.recipe.type === 'printer-scene') {
    return buildPrinterScenePrompt(input);
  }

  if (input.recipe.type === 'flat-lay-scene') {
    return buildFlatLayScenePrompt(input);
  }

  const imageReferenceLines =
    input.images.length > 0
      ? [
          `Use the ${input.images.length} provided ready mask image reference${input.images.length === 1 ? '' : 's'} as the product source context.`,
          'Preserve the important mask identity: colors, silhouettes, horn/ear/frill shapes, eye holes, expressions, and texture style.',
        ]
      : [];

  return [
    `Create a marketing asset for ${input.project.theme}.`,
    `Listing title context: ${input.project.title}.`,
    `Audience: ${input.project.audience}.`,
    `Exact slogan text: ${input.project.slogan}.`,
    `Visual style context: ${input.project.style}.`,
    ...imageReferenceLines,
    'Do not invent unrelated masks, brands, copyrighted characters, celebrities, logos, or watermarks.',
    getMarketingVariantDirection(input),
    ...(input.recipe.customPrompt
      ? [`Additional user direction for this suggestion batch: ${input.recipe.customPrompt}.`]
      : []),
    `Generation variant id: ${input.recipe.id}, option ${input.recipe.optionIndex + 1}, ${input.recipe.stage}.`,
  ].join('\n');
};

const getMarketingRequestQuality = (settings: ImageSettings): ImageQuality =>
  settings.quality === 'high' ? 'medium' : settings.quality;

const getMarketingRequestBackground = (settings: ImageSettings): ImageBackground =>
  settings.model === 'gpt-image-2' && settings.background === 'transparent'
    ? 'opaque'
    : settings.background;

export const buildMarketingSceneGenerationRequestBody = (
  input: MarketingSceneInput,
): Record<string, string | number> => ({
  model: input.settings.model,
  prompt: buildMarketingScenePrompt(input),
  n: 1,
  size: normalizeOpenAIRequestSize(input.settings.size),
  quality: getMarketingRequestQuality(input.settings),
  background: getMarketingRequestBackground(input.settings),
  output_format: input.settings.outputFormat,
});

export const buildMarketingSceneEditFormData = (input: MarketingSceneInput): FormData => {
  const formData = new FormData();
  const model = getMarketingEditModel(input.settings);

  formData.append('model', model);
  for (const [index, image] of input.images.entries()) {
    formData.append('image[]', image, `ready-mask-${index + 1}.png`);
  }
  formData.append('prompt', buildMarketingScenePrompt(input));
  formData.append('n', '1');
  formData.append('size', normalizeOpenAIRequestSize(input.settings.size));
  formData.append('quality', getMarketingRequestQuality(input.settings));
  formData.append('background', getMarketingRequestBackground(input.settings));
  formData.append('output_format', input.settings.outputFormat);

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

const createMarketingFileName = (input: MarketingSceneInput): string => {
  const pageSuffix =
    input.recipe.type === 'mask-sheet' && input.recipe.pageCount && input.recipe.pageCount > 1
      ? `-page-${String((input.recipe.pageIndex ?? 0) + 1).padStart(2, '0')}`
      : '';

  return `marketing-${input.recipe.type}-${input.recipe.stage}-${input.recipe.optionIndex + 1}${pageSuffix}.${input.settings.outputFormat}`;
};

const readImageGenerationResponse = async (
  response: Response,
): Promise<OpenAIImageGenerationResponse> => {
  const parsed: unknown = await response.json();

  return isRecord(parsed) ? parsed : {};
};

export const proxyOpenAIBrief = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJsonObject(request);
  const initialPrompt = readOptionalString(payload.initialPrompt) ?? '';
  const referenceImages = readBriefReferenceImages(payload.referenceImages);

  if (initialPrompt.length === 0 && referenceImages.length === 0) {
    throw new ApiError(400, 'initialPrompt or referenceImages is required.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBriefRequestBody(initialPrompt, referenceImages)),
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

export const proxyOpenAIMarketingSceneImage = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const input = await readMarketingSceneInput(request, env);
  const usesImageReferences = input.images.length > 0;
  const response = await fetch(
    `https://api.openai.com/v1/images/${usesImageReferences ? 'edits' : 'generations'}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getOpenAIKey(env)}`,
        ...(usesImageReferences ? {} : { 'Content-Type': 'application/json' }),
      },
      body: usesImageReferences
        ? buildMarketingSceneEditFormData(input)
        : JSON.stringify(buildMarketingSceneGenerationRequestBody(input)),
    },
  );
  const result = await readImageGenerationResponse(response);

  if (!response.ok) {
    return Response.json(
      {
        error: result.error?.message ?? `OpenAI marketing image request failed: ${response.status}`,
      },
      { status: response.status },
    );
  }

  const firstImage = result.data?.[0];
  if (!firstImage) {
    return Response.json({ error: 'OpenAI returned no marketing image data.' }, { status: 502 });
  }

  const fileName = createMarketingFileName(input);
  if (firstImage.b64_json) {
    return Response.json({
      fileName,
      mimeType: inferMimeType(input.settings.outputFormat),
      base64: firstImage.b64_json,
    });
  }

  if (firstImage.url) {
    const imageResponse = await fetch(firstImage.url);
    if (!imageResponse.ok) {
      return Response.json(
        { error: `Could not download generated marketing image: ${imageResponse.status}` },
        { status: 502 },
      );
    }

    const buffer = await imageResponse.arrayBuffer();
    return Response.json({
      fileName,
      mimeType:
        imageResponse.headers.get('Content-Type') ?? inferMimeType(input.settings.outputFormat),
      base64: arrayBufferToBase64(buffer),
    });
  }

  return Response.json(
    { error: 'OpenAI returned an unsupported marketing image response.' },
    { status: 502 },
  );
};
