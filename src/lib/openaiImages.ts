import type { OpenAIImageSettings, PromptItem } from '../types';

type OpenAIImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
};

const fetchUrlToFile = async (url: string, fileName: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download generated image: ${response.status}`);
  }

  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
};

export const canUseTransparentBackground = (settings: OpenAIImageSettings): boolean =>
  settings.model !== 'gpt-image-2' &&
  settings.background === 'transparent' &&
  (settings.outputFormat === 'png' || settings.outputFormat === 'webp');

export const buildOpenAIImageRequestBody = (
  settings: OpenAIImageSettings,
  promptItem: PromptItem,
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

export const generateImageWithOpenAI = async (
  settings: OpenAIImageSettings,
  promptItem: PromptItem,
): Promise<File> => {
  if (!settings.apiKey.trim()) {
    throw new Error('Paste an OpenAI API key for this session before generating images.');
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildOpenAIImageRequestBody(settings, promptItem)),
  });

  const result = (await response.json()) as OpenAIImageGenerationResponse;

  if (!response.ok) {
    throw new Error(result.error?.message ?? `OpenAI image generation failed: ${response.status}`);
  }

  const firstImage = result.data?.[0];
  if (!firstImage) {
    throw new Error('OpenAI returned no image data.');
  }

  if (firstImage.b64_json) {
    return dataUrlToFile(
      `data:image/${settings.outputFormat};base64,${firstImage.b64_json}`,
      promptItem.expectedFilename,
    );
  }

  if (firstImage.url) {
    return fetchUrlToFile(firstImage.url, promptItem.expectedFilename);
  }

  throw new Error('OpenAI returned an unsupported image response.');
};
