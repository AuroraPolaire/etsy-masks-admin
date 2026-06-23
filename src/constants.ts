import type {
  MarketingImageSettings,
  MarketingSettings,
  OpenAIImageSettings,
  PdfSettings,
  Project,
  ProjectSettings,
} from './types';

export const APP_VERSION = '1.0.0';

export const STORAGE_KEY = 'etsy-masks-admin/project-v1';

export const DEFAULT_THEME = 'Printable Party Masks';

export const DEFAULT_MASK_PROMPT_STYLE =
  'Realistic printable mask for kids with only eye holes, white background, front view, no shadows, no black cut outline, no side punch holes';

export const DEFAULT_SETTINGS: ProjectSettings = {
  title: '',
  theme: '',
  audience: '',
  marketplace: 'Etsy',
  style: '',
  description: '',
  tags: '',
  safetyNote: '',
  printingInstructions: '',
  license: '',
  refundPolicy: '',
};

export const DRAFT_TEMPLATE_SETTINGS: ProjectSettings = {
  ...DEFAULT_SETTINGS,
  theme: DEFAULT_THEME,
  audience: 'Kids',
  style: DEFAULT_MASK_PROMPT_STYLE,
  description:
    'Create an easy party or classroom activity with this printable paper mask bundle for kids. Use the designs for birthday parties, classroom crafts, storytelling, pretend play, and DIY costume corners. This is a digital download only. No physical item will be shipped.',
  tags: 'printable masks, kids party masks, paper masks, birthday party, classroom craft, teacher resources, digital download, kids activity, pretend play, costume craft, party printable, diy masks, craft bundle',
  safetyNote:
    'Adult supervision is required for printing, cutting, and use. Not intended for children under 3 years old. Use child-safe scissors where appropriate. Do not use string, elastic, or cords with young children without supervision.',
  printingInstructions:
    'Print at 100% scale on cardstock or thick paper. Cut around the outside edge, then carefully cut out the eye holes. Punch side holes only if needed. Add string or elastic only with adult supervision. Colors may vary by printer and paper type.',
  license:
    'Personal use and small classroom use are included. Do not resell, redistribute, share, or claim the digital files as your own. Commercial redistribution is not permitted.',
  refundPolicy:
    'Due to the digital nature of this product, refunds and exchanges are not available after download. Please contact the seller if you have any issue with your files.',
};

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  generateA4: true,
  generateUSLetter: true,
  maskScale: 'medium',
  showSubjectLabel: true,
  showInstructionFooter: true,
  pageMarginMm: 12,
  includeCalibrationPage: true,
};

export const DEFAULT_OPENAI_IMAGE_SETTINGS: OpenAIImageSettings = {
  model: 'gpt-image-2',
  size: '1024x1024',
  quality: 'low',
  background: 'opaque',
  outputFormat: 'png',
  coloringPageSize: '1024x1024',
};

export const DEFAULT_MARKETING_PREVIEW_IMAGE_SETTINGS: MarketingImageSettings = {
  model: 'gpt-image-2',
  size: '512x512',
  quality: 'low',
  background: 'opaque',
  outputFormat: 'png',
  coloringPageSize: '1024x1024',
};

export const DEFAULT_MARKETING_FINAL_IMAGE_SETTINGS: MarketingImageSettings = {
  model: 'gpt-image-2',
  size: '2048x2048',
  quality: 'medium',
  background: 'opaque',
  outputFormat: 'png',
  coloringPageSize: '1024x1024',
};

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  slogan: '',
  preview: {
    mode: 'inherit-mask',
    customSettings: DEFAULT_MARKETING_PREVIEW_IMAGE_SETTINGS,
  },
  final: DEFAULT_MARKETING_FINAL_IMAGE_SETTINGS,
  childrenSceneSubjectIds: [],
};

export const PROMPT_NEGATIVE_REQUIREMENTS =
  'no copyrighted character, no brand, no celebrity, no text, no watermark, no scary expression, no full body, no scene, no props, no hands, no multiple masks, no shadows, no dark background, no distorted face, no tiny eye holes, no extra holes, no side holes, no round punch holes, no string holes, no strap holes, no hanging holes, no attachment holes, no black outline, no cutting outline, no sticker border, no contour cut line, no dashed cut guide';

export const MAX_TOTAL_SOURCE_BYTES = 150 * 1024 * 1024;

export const MAX_ETSY_FILE_BYTES = 20 * 1024 * 1024;

export const PRINT_FOOTER =
  'Print at 100% scale. Cut around the outside edge and cut out the eye holes. Adult supervision required.';

export const createDefaultProject = (): Project => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    settings: DEFAULT_SETTINGS,
    subjects: [],
    pdfSettings: DEFAULT_PDF_SETTINGS,
    openAIImageSettings: DEFAULT_OPENAI_IMAGE_SETTINGS,
    marketingSettings: DEFAULT_MARKETING_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
};
