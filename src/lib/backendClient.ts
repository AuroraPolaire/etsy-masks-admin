import type { BackendManagedFileMetadata } from './backendFiles';
import type {
  BackendHealth,
  BackendImageResponse,
  BackendProjectSnapshot,
  BackendRunSummary,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
} from '../types';
import type { OpenAIResponsesApiResponse } from './openaiBrief';

export const MAX_BACKEND_FILE_BYTES = 50 * 1024 * 1024;

export type BackendClientConfig = {
  apiBaseUrl: string;
  adminToken: string;
};

export class BackendApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const normalizeBaseUrl = (apiBaseUrl: string): string => apiBaseUrl.trim().replace(/\/+$/, '');

const getBaseUrl = (apiBaseUrl: string): string => {
  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  if (!baseUrl) {
    throw new BackendApiError(400, 'Add the Cloudflare Worker API URL first.');
  }

  return baseUrl;
};

const getAdminToken = (adminToken: string): string => {
  const token = adminToken.trim();
  if (!token) {
    throw new BackendApiError(401, 'Add the backend admin token first.');
  }

  return token;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const parsed = (await response.json()) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof parsed.error === 'string'
    ) {
      return parsed.error;
    }
  } catch {
    return response.statusText || `Request failed with ${response.status}`;
  }

  return response.statusText || `Request failed with ${response.status}`;
};

const requestJson = async <Result>(
  config: BackendClientConfig,
  path: string,
  options: {
    method?: string | undefined;
    body?: unknown;
    auth?: boolean | undefined;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<Result> => {
  const headers = new Headers();
  const auth = options.auth ?? true;
  if (auth) {
    headers.set('Authorization', `Bearer ${getAdminToken(config.adminToken)}`);
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getBaseUrl(config.apiBaseUrl)}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    throw new BackendApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as Result;
};

const requestBlob = async (
  config: BackendClientConfig,
  path: string,
  signal?: AbortSignal,
): Promise<Blob> => {
  const response = await fetch(`${getBaseUrl(config.apiBaseUrl)}${path}`, {
    headers: {
      Authorization: `Bearer ${getAdminToken(config.adminToken)}`,
    },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new BackendApiError(response.status, await readErrorMessage(response));
  }

  return response.blob();
};

const base64ToFile = (payload: BackendImageResponse): File => {
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], payload.fileName, { type: payload.mimeType || 'image/png' });
};

export const createBackendClient = (config: BackendClientConfig) => ({
  getHealth: (signal?: AbortSignal) =>
    requestJson<BackendHealth>(config, '/api/health', { auth: false, signal }),

  listRuns: (signal?: AbortSignal) =>
    requestJson<{ runs: BackendRunSummary[] }>(config, '/api/runs', { signal }),

  createRun: (project: Project, idea: string, signal?: AbortSignal) =>
    requestJson<{ ok: true; run: BackendRunSummary }>(config, '/api/runs', {
      method: 'POST',
      body: {
        project,
        idea,
      },
      signal,
    }),

  getRun: (runId: string, signal?: AbortSignal) =>
    requestJson<BackendProjectSnapshot>(config, `/api/runs/${encodeURIComponent(runId)}`, {
      signal,
    }),

  getLatestRun: (signal?: AbortSignal) =>
    requestJson<BackendProjectSnapshot>(config, '/api/project', { signal }),

  uploadFile: async (
    runId: string,
    metadata: BackendManagedFileMetadata,
    file: File,
    signal?: AbortSignal,
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', file, metadata.name);

    const response = await fetch(
      `${getBaseUrl(config.apiBaseUrl)}/api/runs/${encodeURIComponent(
        runId,
      )}/files/${encodeURIComponent(metadata.id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getAdminToken(config.adminToken)}`,
        },
        body: formData,
        ...(signal ? { signal } : {}),
      },
    );

    if (!response.ok) {
      throw new BackendApiError(response.status, await readErrorMessage(response));
    }
  },

  downloadFile: (runId: string, fileId: string, signal?: AbortSignal) =>
    requestBlob(
      config,
      `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(fileId)}`,
      signal,
    ),

  deleteRun: (runId: string, signal?: AbortSignal) =>
    requestJson<{ ok: true }>(config, `/api/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
      signal,
    }),

  deleteProject: (signal?: AbortSignal) =>
    requestJson<{ ok: true }>(config, '/api/project', { method: 'DELETE', signal }),

  generateProjectDraft: async (
    initialPrompt: string,
    signal?: AbortSignal,
  ): Promise<ProjectDraft> => {
    const { buildOpenAIProjectBriefRequestBody, parseOpenAIProjectBriefResponse } =
      await import('./openaiBrief');
    const response = await requestJson<OpenAIResponsesApiResponse>(config, '/api/openai/brief', {
      method: 'POST',
      body: {
        requestBody: buildOpenAIProjectBriefRequestBody(initialPrompt),
      },
      signal,
    });

    return parseOpenAIProjectBriefResponse(response);
  },

  generateImage: async (
    settings: OpenAIImageSettings,
    promptItem: PromptItem,
    signal?: AbortSignal,
  ): Promise<File> => {
    const { buildOpenAIImageRequestBody } = await import('./openaiImages');
    const response = await requestJson<BackendImageResponse>(config, '/api/openai/images', {
      method: 'POST',
      body: {
        requestBody: buildOpenAIImageRequestBody(settings, promptItem),
        fileName: promptItem.expectedFilename,
        outputFormat: settings.outputFormat,
      },
      signal,
    });

    return base64ToFile(response);
  },
});
