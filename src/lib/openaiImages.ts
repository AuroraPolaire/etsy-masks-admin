import type { OpenAIImageSettings } from '../types';

export const canUseTransparentBackground = (settings: OpenAIImageSettings): boolean =>
  settings.model !== 'gpt-image-2' &&
  settings.background === 'transparent' &&
  (settings.outputFormat === 'png' || settings.outputFormat === 'webp');
