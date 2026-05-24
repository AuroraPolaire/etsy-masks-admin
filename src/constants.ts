import type { OpenAIImageSettings, PdfSettings, Project, ProjectSettings } from './types';

export const APP_VERSION = '1.0.0';

export const STORAGE_KEY = 'etsy-masks-admin/project-v1';

export const DEFAULT_THEME = 'Realistic Animal Masks';

export const DEFAULT_ANIMALS = [
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
];

export const DEFAULT_SETTINGS: ProjectSettings = {
  title:
    'Realistic Animal Masks Printable Bundle for Kids, 12 PNG Paper Masks, Safari Zoo Party, Classroom Craft, Digital Download',
  theme: DEFAULT_THEME,
  audience: 'Kids',
  marketplace: 'Etsy',
  style: 'Front-facing realistic printable paper masks',
  description:
    'Create fun animal-themed activities with this printable realistic animal mask bundle for kids. Perfect for birthday parties, classroom crafts, storytelling, pretend play, and DIY costume activities. This is a digital download only. No physical item will be shipped.',
  tags: 'animal masks, printable masks, kids party masks, zoo animal masks, safari masks, classroom craft, paper masks, birthday party, teacher resources, animal costume, digital download, kids activity, wildlife masks',
  safetyNote:
    'Adult supervision is required for printing, cutting, and use. Not intended for children under 3 years old. Use child-safe scissors where appropriate. Do not use strings, elastic, or cords with young children without supervision.',
  printingInstructions:
    'Print at 100% scale on cardstock or thick paper. Cut around the outside edge. Carefully cut out the eye holes. Punch side holes only if needed. Add string or elastic only with adult supervision. Colors may vary depending on printer and paper type.',
  license:
    'Personal use and small classroom use are included. Do not resell, redistribute, share, or claim the digital files as your own. Commercial redistribution of the files is not permitted.',
  refundPolicy:
    'Due to the digital nature of this product, refunds and exchanges are not available after download. Please contact the seller if you have any issue with your files.',
};

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  generateA4: true,
  generateUSLetter: true,
  maskScale: 'medium',
  showAnimalLabel: true,
  showInstructionFooter: true,
  pageMarginMm: 12,
  includeCalibrationPage: true,
};

export const DEFAULT_OPENAI_IMAGE_SETTINGS: OpenAIImageSettings = {
  apiKey: '',
  model: 'gpt-image-1.5',
  size: '1024x1024',
  quality: 'high',
  background: 'transparent',
  outputFormat: 'png',
};

export const PROMPT_NEGATIVE_REQUIREMENTS =
  'no copyrighted character, no brand, no celebrity, no text, no watermark, no scary expression, no full body, no background, no distorted face';

export const BLOCKED_IP_TERMS = [
  'disney',
  'pixar',
  'paw patrol',
  'bluey',
  'pokemon',
  'marvel',
  'spider-man',
  'batman',
  'barbie',
  'harry potter',
  'taylor swift',
  'celebrity',
  'peppa pig',
  'minecraft',
  'minions',
];

export const ACCEPTED_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'zip', 'txt', 'json'];

export const MAX_TOTAL_SOURCE_BYTES = 150 * 1024 * 1024;

export const MAX_ETSY_FILE_BYTES = 20 * 1024 * 1024;

export const PRINT_FOOTER =
  'Print at 100% scale. Cut around the outside edge and cut out the eye holes. Adult supervision required.';

export const createDefaultProject = (): Project => {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    settings: DEFAULT_SETTINGS,
    animals: DEFAULT_ANIMALS.map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
    pdfSettings: DEFAULT_PDF_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
};
