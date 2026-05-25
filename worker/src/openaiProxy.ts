import type { Env } from './types';

type OpenAIProxyBriefRequest = {
  requestBody: unknown;
};

type OpenAIProxyImageRequest = {
  requestBody: unknown;
  fileName: string;
  outputFormat: string;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
};

const getOpenAIKey = (env: Env): string => {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for this Worker.');
  }

  return apiKey;
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

const inferMimeType = (outputFormat: string): string =>
  outputFormat === 'jpeg' ? 'image/jpeg' : `image/${outputFormat || 'png'}`;

export const proxyOpenAIBrief = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJson(request);
  if (!isRecord(payload) || !isRecord((payload as OpenAIProxyBriefRequest).requestBody)) {
    return Response.json({ error: 'Missing OpenAI brief request body.' }, { status: 400 });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload.requestBody),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  });
};

export const proxyOpenAIImage = async (request: Request, env: Env): Promise<Response> => {
  const payload = await readJson(request);
  if (!isRecord(payload) || !isRecord((payload as OpenAIProxyImageRequest).requestBody)) {
    return Response.json({ error: 'Missing OpenAI image request body.' }, { status: 400 });
  }

  const fileName =
    typeof payload.fileName === 'string' && payload.fileName.trim().length > 0
      ? payload.fileName
      : 'generated-image.png';
  const outputFormat =
    typeof payload.outputFormat === 'string' && payload.outputFormat.trim().length > 0
      ? payload.outputFormat
      : 'png';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload.requestBody),
  });
  const result: OpenAIImageGenerationResponse = await response.json();

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
      fileName,
      mimeType: inferMimeType(outputFormat),
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
      fileName,
      mimeType: imageResponse.headers.get('Content-Type') ?? inferMimeType(outputFormat),
      base64: arrayBufferToBase64(buffer),
    });
  }

  return Response.json(
    { error: 'OpenAI returned an unsupported image response.' },
    { status: 502 },
  );
};
