import { describe, expect, it } from 'vitest';

import { canUseTransparentBackground } from '../openaiImages';

import type { OpenAIImageSettings } from '../../types';

const settings: OpenAIImageSettings = {
  model: 'gpt-image-1.5',
  size: '1024x1024',
  quality: 'high',
  background: 'transparent',
  outputFormat: 'png',
};

describe('OpenAI image helpers', () => {
  it('knows when transparent output is supported', () => {
    expect(canUseTransparentBackground(settings)).toBe(true);
    expect(canUseTransparentBackground({ ...settings, model: 'gpt-image-2' })).toBe(false);
    expect(canUseTransparentBackground({ ...settings, outputFormat: 'jpeg' })).toBe(false);
  });
});
