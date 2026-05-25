import {
  ApiError,
  getCorsHeaders,
  getMaxFileBytes,
  isRecord,
  jsonResponse,
  readJsonObject,
  readRequiredString,
  requireAuth,
  withCors,
} from './http';
import { proxyOpenAIBrief, proxyOpenAIImage } from './openaiProxy';
import {
  createRun,
  deleteAllRuns,
  deleteRun,
  getRunFile,
  getRunSnapshot,
  listRuns,
  putRunFile,
} from './storage';

import type { Env } from './types';

const getPathParts = (request: Request): string[] => {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  return pathname.split('/').filter(Boolean).map(decodeURIComponent);
};

const getHealth = (request: Request, env: Env): Response =>
  jsonResponse(request, env, {
    ok: true,
    version: env.APP_VERSION ?? 'dev',
    storage: {
      d1: true,
      r2: true,
    },
    authConfigured: Boolean(env.ADMIN_TOKEN?.trim()),
    openaiProxyReady: Boolean(env.OPENAI_API_KEY?.trim()),
    maxFileBytes: getMaxFileBytes(env),
  });

const listRunSummaries = async (request: Request, env: Env): Promise<Response> =>
  jsonResponse(request, env, {
    runs: await listRuns(env),
  });

const createProjectRun = async (request: Request, env: Env): Promise<Response> => {
  const body = await readJsonObject(request);
  const project = body.project;
  if (!isRecord(project)) {
    throw new ApiError(400, 'project is required.');
  }

  const run = await createRun(env, {
    project,
    idea: readRequiredString(body.idea, 'idea'),
  });

  return jsonResponse(request, env, {
    ok: true,
    run,
  });
};

const getRun = async (request: Request, env: Env, runId?: string): Promise<Response> => {
  const snapshot = await getRunSnapshot(env, runId);

  return jsonResponse(request, env, {
    project: snapshot?.project ?? null,
    runId: snapshot?.runId,
    idea: snapshot?.idea,
    updatedAt: snapshot?.updatedAt,
    files: snapshot?.files ?? [],
    events: snapshot?.events ?? [],
  });
};

const getFile = async (
  request: Request,
  env: Env,
  runId: string,
  fileId: string,
): Promise<Response> => {
  const { object, row } = await getRunFile(env, runId, fileId);

  return withCors(
    new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? row.type,
        'Content-Disposition': `attachment; filename="${row.name.replace(/"/g, '')}"`,
      },
    }),
    request,
    env,
  );
};

const routeAuthenticatedRequest = async (
  request: Request,
  env: Env,
  parts: string[],
): Promise<Response> => {
  if (parts.length === 1 && parts[0] === 'api') {
    return jsonResponse(request, env, { error: 'Not found.' }, { status: 404 });
  }

  if (parts[1] === 'runs' && parts.length === 2 && request.method === 'GET') {
    return listRunSummaries(request, env);
  }

  if (parts[1] === 'runs' && parts.length === 2 && request.method === 'POST') {
    return createProjectRun(request, env);
  }

  const runId = parts[1] === 'runs' ? parts[2] : undefined;
  if (runId && parts.length === 3 && request.method === 'GET') {
    return getRun(request, env, runId);
  }

  if (runId && parts.length === 3 && request.method === 'DELETE') {
    await deleteRun(env, runId);
    return jsonResponse(request, env, { ok: true });
  }

  const fileId = runId && parts[3] === 'files' ? parts[4] : undefined;
  if (runId && fileId && parts.length === 5 && request.method === 'PUT') {
    await putRunFile(env, runId, fileId, await request.formData());
    return jsonResponse(request, env, { ok: true, runId, fileId });
  }

  if (runId && fileId && parts.length === 5 && request.method === 'GET') {
    return getFile(request, env, runId, fileId);
  }

  if (parts[1] === 'project' && parts.length === 2 && request.method === 'GET') {
    return getRun(request, env);
  }

  if (parts[1] === 'project' && parts.length === 2 && request.method === 'DELETE') {
    await deleteAllRuns(env);
    return jsonResponse(request, env, { ok: true });
  }

  if (parts[1] === 'openai' && parts[2] === 'brief' && request.method === 'POST') {
    return withCors(await proxyOpenAIBrief(request, env), request, env);
  }

  if (parts[1] === 'openai' && parts[2] === 'images' && request.method === 'POST') {
    return withCors(await proxyOpenAIImage(request, env), request, env);
  }

  return jsonResponse(request, env, { error: 'Not found.' }, { status: 404 });
};

const routeRequest = async (request: Request, env: Env): Promise<Response> => {
  const parts = getPathParts(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, env),
    });
  }

  if (parts[0] === 'api' && parts[1] === 'health' && request.method === 'GET') {
    return getHealth(request, env);
  }

  if (parts[0] !== 'api') {
    return jsonResponse(request, env, { error: 'Not found.' }, { status: 404 });
  }

  requireAuth(request, env);
  return routeAuthenticatedRequest(request, env, parts);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse(request, env, { error: error.message }, { status: error.status });
      }

      const message = error instanceof Error ? error.message : 'Unexpected backend error.';
      const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
      return jsonResponse(request, env, { error: message }, { status });
    }
  },
};
