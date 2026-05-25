import type { Env } from './types';

const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const nowIso = (): string => new Date().toISOString();

export const getMaxFileBytes = (env: Env): number => {
  const configured = Number(env.MAX_FILE_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_FILE_BYTES;
};

export const isBlobLike = (value: unknown): value is Blob => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.size === 'number' &&
    typeof value.type === 'string' &&
    typeof value.stream === 'function'
  );
};

export const readRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  return value.trim();
};

export const readOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export const readNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, `${fieldName} must be a finite number.`);
  }

  return value;
};

export const readBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, `${fieldName} must be a boolean.`);
  }

  return value;
};

export const readJsonObject = async (request: Request): Promise<Record<string, unknown>> => {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new ApiError(400, 'Request body must be a JSON object.');
  }

  return parsed;
};

export const requireAuth = (request: Request, env: Env): void => {
  const adminToken = env.ADMIN_TOKEN?.trim();
  if (!adminToken) {
    throw new ApiError(503, 'ADMIN_TOKEN is not configured for this Worker.');
  }

  if (request.headers.get('Authorization') !== `Bearer ${adminToken}`) {
    throw new ApiError(401, 'Invalid or missing admin token.');
  }
};

export const getCorsHeaders = (request: Request, env: Env): Headers => {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin || allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', origin ?? '*');
    return headers;
  }

  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return headers;
};

export const withCors = (response: Response, request: Request, env: Env): Response => {
  const headers = new Headers(response.headers);
  getCorsHeaders(request, env).forEach((value, key) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const jsonResponse = (
  request: Request,
  env: Env,
  data: unknown,
  init: ResponseInit = {},
): Response => {
  const headers = new Headers(init.headers);
  getCorsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
};
