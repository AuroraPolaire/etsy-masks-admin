import { describe, expect, it } from 'vitest';

import { buildOpenAIImageRequestBody, canUseTransparentBackground } from '../openaiImages';

import type { OpenAIImageSettings, PromptItem } from '../../types';

const promptItem: PromptItem = {
  subjectId: 'lion',
  subjectName: 'Lion',
  expectedFilename: 'lion.png',
  prompt: 'Front-facing realistic lion mask',
  negativeRequirements: 'no text',
};

const settings: OpenAIImageSettings = {
  apiKey: 'sk-test',
  model: 'gpt-image-1.5',
  size: '1024x1024',
  quality: 'high',
  background: 'transparent',
  outputFormat: 'png',
};

describe('OpenAI image helpers', () => {
  it('builds an image generation request body', () => {
    expect(buildOpenAIImageRequestBody(settings, promptItem)).toMatchObject({
      model: 'gpt-image-1.5',
      n: 1,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      output_format: 'png',
    });
  });

  it('does not request transparent backgrounds from gpt-image-2', () => {
    expect(
      buildOpenAIImageRequestBody({ ...settings, model: 'gpt-image-2' }, promptItem).background,
    ).toBe('opaque');
  });

  it('knows when transparent output is supported', () => {
    expect(canUseTransparentBackground(settings)).toBe(true);
    expect(canUseTransparentBackground({ ...settings, outputFormat: 'jpeg' })).toBe(false);
  });
});
