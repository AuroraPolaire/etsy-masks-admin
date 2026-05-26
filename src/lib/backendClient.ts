import { createDefaultProject } from '../constants';
import { normalizeProject } from './projectSchema';

import type {
  BackendHealth,
  BackendImageResponse,
  BackendProjectSnapshot,
  BackendRunSummary,
  BackendRunStatus,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
} from '../types';
import type { BackendManagedFileMetadata } from './backendFiles';
import type { OpenAIResponsesApiResponse } from './openaiBrief';

export const MAX_BACKEND_FILE_BYTES = 50 * 1024 * 1024;

type BackendProjectSnapshotResponse = Omit<BackendProjectSnapshot, 'project'> & {
  project: unknown;
};

export class BackendApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const parsed = await response.json();
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
  path: string,
  options: {
    method?: string | undefined;
    body?: unknown;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<Result> => {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!response.ok) {
    throw new BackendApiError(response.status, await readErrorMessage(response));
  }

  return response.json();
};

const requestBlob = async (path: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetch(path, {
    credentials: 'include',
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

const normalizeBackendSnapshot = (
  snapshot: BackendProjectSnapshotResponse,
): BackendProjectSnapshot => ({
  ...snapshot,
  project: snapshot.project ? normalizeProject(snapshot.project, createDefaultProject()) : null,
});

export const createBackendClient = () => ({
  getHealth: (signal?: AbortSignal) => requestJson<BackendHealth>('/api/health', { signal }),

  listRuns: (signal?: AbortSignal) =>
    requestJson<{ runs: BackendRunSummary[] }>('/api/runs', { signal }),

  createRun: (
    project: Project,
    idea: string,
    status: BackendRunStatus = 'draft',
    signal?: AbortSignal,
  ) =>
    requestJson<{ ok: true; run: BackendRunSummary }>('/api/runs', {
      method: 'POST',
      body: {
        project,
        idea,
        status,
      },
      signal,
    }),

  updateRun: (
    runId: string,
    project: Project,
    idea: string,
    status: BackendRunStatus = 'draft',
    signal?: AbortSignal,
  ) =>
    requestJson<{ ok: true; run: BackendRunSummary }>(`/api/runs/${encodeURIComponent(runId)}`, {
      method: 'PUT',
      body: {
        project,
        idea,
        status,
      },
      signal,
    }),

  finalizeRun: (runId: string, project: Project, idea: string, signal?: AbortSignal) =>
    requestJson<{ ok: true; run: BackendRunSummary }>(
      `/api/runs/${encodeURIComponent(runId)}/finalize`,
      {
        method: 'POST',
        body: {
          project,
          idea,
        },
        signal,
      },
    ),

  getRun: async (runId: string, signal?: AbortSignal) =>
    normalizeBackendSnapshot(
      await requestJson<BackendProjectSnapshotResponse>(`/api/runs/${encodeURIComponent(runId)}`, {
        signal,
      }),
    ),

  getLatestRun: async (signal?: AbortSignal) =>
    normalizeBackendSnapshot(
      await requestJson<BackendProjectSnapshotResponse>('/api/project', { signal }),
    ),

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
      `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(metadata.id)}`,
      {
        method: 'PUT',
        body: formData,
        credentials: 'include',
        ...(signal ? { signal } : {}),
      },
    );

    if (!response.ok) {
      throw new BackendApiError(response.status, await readErrorMessage(response));
    }
  },

  downloadFile: (runId: string, fileId: string, signal?: AbortSignal) =>
    requestBlob(
      `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(fileId)}`,
      signal,
    ),

  deleteFile: (runId: string, fileId: string, signal?: AbortSignal) =>
    requestJson<{ ok: true }>(
      `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(fileId)}`,
      {
        method: 'DELETE',
        signal,
      },
    ),

  deleteRun: (runId: string, signal?: AbortSignal) =>
    requestJson<{ ok: true }>(`/api/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
      signal,
    }),

  deleteProject: (signal?: AbortSignal) =>
    requestJson<{ ok: true }>('/api/project', { method: 'DELETE', signal }),

  generateProjectDraft: async (
    initialPrompt: string,
    signal?: AbortSignal,
  ): Promise<ProjectDraft> => {
    const { parseOpenAIProjectBriefResponse } = await import('./openaiBrief');
    const response = await requestJson<OpenAIResponsesApiResponse>('/api/openai/brief', {
      method: 'POST',
      body: {
        initialPrompt,
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
    const response = await requestJson<BackendImageResponse>('/api/openai/images', {
      method: 'POST',
      body: {
        settings,
        promptItem,
      },
      signal,
    });

    return base64ToFile(response);
  },

  generateColoringPageImage: async (
    settings: OpenAIImageSettings,
    promptItem: PromptItem,
    sourceFile: File,
    signal?: AbortSignal,
  ): Promise<File> => {
    const formData = new FormData();
    formData.append('settings', JSON.stringify(settings));
    formData.append('promptItem', JSON.stringify(promptItem));
    formData.append('image', sourceFile, sourceFile.name);

    const response = await fetch('/api/openai/images/coloring-page', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      throw new BackendApiError(response.status, await readErrorMessage(response));
    }

    return base64ToFile(await response.json());
  },
});
