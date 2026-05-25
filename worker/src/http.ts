import type { Env } from './types';

const DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCESS_CERTS_CACHE_MS = 10 * 60 * 1000;

type AuthMode = 'access' | 'none';

type AccessJwt = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signedData: Uint8Array;
  signature: Uint8Array;
};

let accessCertsCache:
  | {
      teamDomain: string;
      expiresAt: number;
      keys: JsonWebKey[];
    }
  | undefined;

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

const getAuthMode = (env: Env): AuthMode =>
  env.AUTH_MODE?.trim().toLowerCase() === 'none' ? 'none' : 'access';

const getAccessTeamDomain = (env: Env): string =>
  (env.CLOUDFLARE_ACCESS_TEAM_DOMAIN ?? '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

const getAccessAud = (env: Env): string => (env.CLOUDFLARE_ACCESS_AUD ?? '').trim();

export const getAuthStatus = (
  env: Env,
): {
  mode: AuthMode;
  configured: boolean;
} => {
  const mode = getAuthMode(env);

  return {
    mode,
    configured:
      mode === 'none' || (getAccessTeamDomain(env).length > 0 && getAccessAud(env).length > 0),
  };
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const parseJwtPart = (value: string, partName: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    throw new ApiError(401, `Cloudflare Access JWT ${partName} is invalid.`);
  }

  throw new ApiError(401, `Cloudflare Access JWT ${partName} must be an object.`);
};

const parseAccessJwt = (token: string): AccessJwt => {
  const parts = token.split('.');
  const [header, payload, signature] = parts;

  if (parts.length !== 3 || !header || !payload || !signature) {
    throw new ApiError(401, 'Cloudflare Access JWT is malformed.');
  }

  return {
    header: parseJwtPart(header, 'header'),
    payload: parseJwtPart(payload, 'payload'),
    signedData: new TextEncoder().encode(`${header}.${payload}`),
    signature: base64UrlToBytes(signature),
  };
};

const fetchAccessJwks = async (teamDomain: string): Promise<JsonWebKey[]> => {
  const now = Date.now();
  if (accessCertsCache?.teamDomain === teamDomain && accessCertsCache.expiresAt > now) {
    return accessCertsCache.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new ApiError(503, `Could not load Cloudflare Access certificates: ${response.status}`);
  }

  const parsed: unknown = await response.json();
  if (!isRecord(parsed) || !Array.isArray(parsed.keys)) {
    throw new ApiError(503, 'Cloudflare Access certificates response is invalid.');
  }

  const keys = parsed.keys.filter(
    (key): key is JsonWebKey => isRecord(key) && typeof key.kid === 'string',
  );
  accessCertsCache = {
    teamDomain,
    expiresAt: now + ACCESS_CERTS_CACHE_MS,
    keys,
  };

  return keys;
};

const validateAccessClaims = (
  payload: Record<string, unknown>,
  env: Env,
  teamDomain: string,
  aud: string,
): void => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuer = typeof payload.iss === 'string' ? payload.iss.replace(/\/+$/, '') : '';
  const expectedIssuer = `https://${teamDomain}`;
  const expiresAt = typeof payload.exp === 'number' ? payload.exp : 0;
  const notBefore = typeof payload.nbf === 'number' ? payload.nbf : undefined;
  const audiences =
    typeof payload.aud === 'string'
      ? [payload.aud]
      : Array.isArray(payload.aud)
        ? payload.aud.filter((item): item is string => typeof item === 'string')
        : [];

  if (issuer !== expectedIssuer) {
    throw new ApiError(401, 'Cloudflare Access JWT issuer is invalid.');
  }

  if (!audiences.includes(aud)) {
    throw new ApiError(401, 'Cloudflare Access JWT audience is invalid.');
  }

  if (expiresAt <= nowSeconds) {
    throw new ApiError(401, 'Cloudflare Access JWT is expired.');
  }

  if (notBefore !== undefined && notBefore > nowSeconds) {
    throw new ApiError(401, 'Cloudflare Access JWT is not active yet.');
  }

  const allowedEmails = (env.CLOUDFLARE_ACCESS_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return;
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (!allowedEmails.includes(email)) {
    throw new ApiError(403, 'Cloudflare Access user is not allowed for this Worker.');
  }
};

const verifyAccessJwt = async (token: string, env: Env): Promise<void> => {
  const teamDomain = getAccessTeamDomain(env);
  const aud = getAccessAud(env);

  if (!teamDomain || !aud) {
    throw new ApiError(503, 'Cloudflare Access authentication is not configured for this Worker.');
  }

  const jwt = parseAccessJwt(token);
  const kid = typeof jwt.header.kid === 'string' ? jwt.header.kid : '';
  const alg = typeof jwt.header.alg === 'string' ? jwt.header.alg : '';

  if (!kid || alg !== 'RS256') {
    throw new ApiError(401, 'Cloudflare Access JWT header is invalid.');
  }

  const jwk = (await fetchAccessJwks(teamDomain)).find((key) => isRecord(key) && key.kid === kid);
  if (!jwk) {
    throw new ApiError(401, 'Cloudflare Access JWT signing key was not found.');
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    jwt.signature,
    jwt.signedData,
  );

  if (!verified) {
    throw new ApiError(401, 'Cloudflare Access JWT signature is invalid.');
  }

  validateAccessClaims(jwt.payload, env, teamDomain, aud);
};

export const requireAuth = async (request: Request, env: Env): Promise<void> => {
  const status = getAuthStatus(env);
  if (status.mode === 'none') {
    return;
  }

  if (!status.configured) {
    throw new ApiError(503, 'Cloudflare Access authentication is not configured for this Worker.');
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion')?.trim();
  if (!token) {
    throw new ApiError(401, 'Cloudflare Access JWT is missing.');
  }

  await verifyAccessJwt(token, env);
};

export const getCorsHeaders = (request: Request, env: Env): Headers => {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    if (origin) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return headers;
  }

  if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
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
