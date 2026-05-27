import { createDefaultProject } from '../constants';
import { normalizeProject } from './projectSchema';

import type {
  BackendFileRecord,
  BackendHealth,
  BackendImageResponse,
  BackendProjectSnapshot,
  CreateRunRevisionInput,
  BackendRunSummary,
  EtsySeoAnalysis,
  ManagedFile,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
  RestoreRunRevisionResult,
  RunRevisionDetail,
  RunRevisionRestoreMode,
  RunRevisionSummary,
} from '../types';
import type { BackendManagedFileMetadata } from './backendFiles';
import type { OpenAIResponsesApiResponse } from './openaiBrief';

export const MAX_BACKEND_FILE_BYTES = 50 * 1024 * 1024;

type BackendProjectSnapshotResponse = Omit<BackendProjectSnapshot, 'project'> & {
  project: unknown;
};

type RunRevisionDetailResponse = Omit<RunRevisionDetail, 'project'> & {
  project: unknown;
};

type RestoreRunRevisionResponse = Omit<RestoreRunRevisionResult, 'snapshot'> & {
  snapshot: BackendProjectSnapshotResponse;
};

export class BackendApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const RETRYABLE_STATUS_CODES = new Set([
  408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524,
]);

const sleep = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request cancelled', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(resolve, delayMs);
    const abort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Request cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
  });

export const isRetryableBackendStatus = (status: number): boolean =>
  RETRYABLE_STATUS_CODES.has(status);

const getRetryDelayMs = (attempt: number): number =>
  Math.min(750 * 2 ** attempt, 6000) + Math.floor(Math.random() * 250);

const fetchWithRetry = async (
  path: string,
  init: RequestInit,
  {
    signal,
    retries,
  }: {
    signal?: AbortSignal | undefined;
    retries: number;
  },
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(path, {
        ...init,
        credentials: 'include',
        ...(signal ? { signal } : {}),
      });

      if (response.ok || !isRetryableBackendStatus(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      if (signal?.aborted || error instanceof DOMException) {
        throw error;
      }

      lastError = error;
      if (attempt === retries) {
        throw error;
      }
    }

    await sleep(getRetryDelayMs(attempt), signal);
  }

  throw lastError instanceof Error ? lastError : new Error('Backend request failed.');
};

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
    retries?: number | undefined;
  } = {},
): Promise<Result> => {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchWithRetry(
    path,
    {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    },
    {
      signal: options.signal,
      retries:
        options.retries ??
        (options.method === undefined || options.method === 'GET' || options.method === 'PUT'
          ? 2
          : 0),
    },
  );

  if (!response.ok) {
    throw new BackendApiError(response.status, await readErrorMessage(response));
  }

  return response.json();
};

const requestBlob = async (path: string, signal?: AbortSignal): Promise<Blob> => {
  const response = await fetchWithRetry(path, {}, { signal, retries: 2 });

  if (!response.ok) {
    throw new BackendApiError(response.status, await readErrorMessage(response));
  }

  return response.blob();
};

export const getFileDownloadPath = (
  runId: string,
  file: Pick<BackendFileRecord, 'id' | 'updatedAt'>,
): string => {
  const query = file.updatedAt ? `?v=${encodeURIComponent(file.updatedAt)}` : '';

  return `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(file.id)}${query}`;
};

const base64ToFile = (payload: BackendImageResponse): File => {
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], payload.fileName, { type: payload.mimeType || 'image/png' });
};

export const createDeterministicUploadId = async (
  runId: string,
  metadata: BackendManagedFileMetadata,
  file: File,
): Promise<string> => {
  const payload = JSON.stringify({
    runId,
    metadata,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const normalizeBackendSnapshot = (
  snapshot: BackendProjectSnapshotResponse,
): BackendProjectSnapshot => ({
  ...snapshot,
  project: snapshot.project ? normalizeProject(snapshot.project, createDefaultProject()) : null,
});

const normalizeRunRevisionDetail = (revision: RunRevisionDetailResponse): RunRevisionDetail => ({
  ...revision,
  project: revision.project ? normalizeProject(revision.project, createDefaultProject()) : null,
});

const summarizeFilesForAiReview = (files: ManagedFile[]) =>
  files.map((file) => ({
    name: file.name,
    kind: file.kind,
    size: file.size,
    type: file.type,
    reviewState: file.reviewState,
    mappedSubjectId: file.mappedSubjectId ?? null,
    assetVariant: file.assetVariant,
    marketingAsset: file.marketingAsset ?? null,
    hasImageMetadata: Boolean(file.imageMetadata),
    explicitlyConfirmed: file.explicitlyConfirmed,
  }));

export const createBackendClient = () => ({
  getHealth: (signal?: AbortSignal) => requestJson<BackendHealth>('/api/health', { signal }),

  listRuns: (signal?: AbortSignal) =>
    requestJson<{ runs: BackendRunSummary[] }>('/api/runs', { signal }),

  createRun: (project: Project, idea: string, signal?: AbortSignal) =>
    requestJson<{ ok: true; run: BackendRunSummary }>('/api/runs', {
      method: 'POST',
      body: {
        project,
        idea,
      },
      signal,
    }),

  updateRun: (runId: string, project: Project, idea: string, signal?: AbortSignal) =>
    requestJson<{ ok: true; run: BackendRunSummary }>(`/api/runs/${encodeURIComponent(runId)}`, {
      method: 'PUT',
      body: {
        project,
        idea,
      },
      signal,
    }),

  getRun: async (runId: string, signal?: AbortSignal) =>
    normalizeBackendSnapshot(
      await requestJson<BackendProjectSnapshotResponse>(`/api/runs/${encodeURIComponent(runId)}`, {
        signal,
      }),
    ),

  listRunRevisions: (runId: string, signal?: AbortSignal) =>
    requestJson<{ revisions: RunRevisionSummary[] }>(
      `/api/runs/${encodeURIComponent(runId)}/revisions`,
      { signal },
    ),

  createRunRevision: (runId: string, input: CreateRunRevisionInput, signal?: AbortSignal) =>
    requestJson<{ ok: true; revision: RunRevisionSummary }>(
      `/api/runs/${encodeURIComponent(runId)}/revisions`,
      {
        method: 'POST',
        body: input,
        signal,
      },
    ),

  getRunRevision: async (runId: string, revisionId: string, signal?: AbortSignal) =>
    normalizeRunRevisionDetail(
      (
        await requestJson<{ revision: RunRevisionDetailResponse }>(
          `/api/runs/${encodeURIComponent(runId)}/revisions/${encodeURIComponent(revisionId)}`,
          { signal },
        )
      ).revision,
    ),

  updateRunRevision: (
    runId: string,
    revisionId: string,
    input: { label?: string; description?: string; isPinned?: boolean },
    signal?: AbortSignal,
  ) =>
    requestJson<{ ok: true; revision: RunRevisionSummary }>(
      `/api/runs/${encodeURIComponent(runId)}/revisions/${encodeURIComponent(revisionId)}`,
      {
        method: 'PATCH',
        body: input,
        signal,
      },
    ),

  restoreRunRevision: async (
    runId: string,
    revisionId: string,
    mode: RunRevisionRestoreMode,
    signal?: AbortSignal,
  ): Promise<RestoreRunRevisionResult> => {
    const response = await requestJson<RestoreRunRevisionResponse>(
      `/api/runs/${encodeURIComponent(runId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
      {
        method: 'POST',
        body: { mode },
        signal,
      },
    );

    return {
      safetyRevision: response.safetyRevision,
      restoredRevision: response.restoredRevision,
      snapshot: normalizeBackendSnapshot(response.snapshot),
    };
  },

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
    const { createImageThumbnailBlob } = await import('./imageThumbnails');
    const thumbnail = await createImageThumbnailBlob(file);
    const formData = new FormData();
    formData.append('uploadId', await createDeterministicUploadId(runId, metadata, file));
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', file, metadata.name);
    if (thumbnail) {
      formData.append('thumbnail', thumbnail, `${metadata.id}-thumbnail.webp`);
    }

    const response = await fetchWithRetry(
      `/api/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(metadata.id)}`,
      {
        method: 'PUT',
        body: formData,
      },
      {
        signal,
        retries: 3,
      },
    );

    if (!response.ok) {
      throw new BackendApiError(response.status, await readErrorMessage(response));
    }
  },

  downloadFile: (
    runId: string,
    file: Pick<BackendFileRecord, 'id' | 'updatedAt'>,
    signal?: AbortSignal,
  ) => requestBlob(getFileDownloadPath(runId, file), signal),

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

  generateEtsySeoAnalysis: async (
    project: Project,
    files: ManagedFile[],
    signal?: AbortSignal,
  ): Promise<EtsySeoAnalysis> => {
    const { parseOpenAIEtsySeoResponse } = await import('./openaiBrief');
    const response = await requestJson<OpenAIResponsesApiResponse>('/api/openai/etsy-seo', {
      method: 'POST',
      body: {
        project,
        files: summarizeFilesForAiReview(files),
      },
      signal,
    });

    return parseOpenAIEtsySeoResponse(response);
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

  generateMarketingSceneImage: async (
    settings: MarketingImageSettings,
    project: Project,
    sourceFiles: ManagedFile[],
    recipe: MarketingGenerationRecipe,
    signal?: AbortSignal,
  ): Promise<File> => {
    const formData = new FormData();
    formData.append('settings', JSON.stringify(settings));
    formData.append(
      'project',
      JSON.stringify({
        theme: project.settings.theme || 'Printable masks',
        title: project.settings.title || project.settings.theme || 'Printable masks',
        audience: project.settings.audience || 'Kids',
        style: project.settings.style || 'Printable kids mask bundle',
        slogan:
          project.marketingSettings.slogan ||
          project.settings.title ||
          `${project.settings.theme || 'Printable masks'} for kids`,
      }),
    );
    formData.append('recipe', JSON.stringify(recipe));
    for (const sourceFile of sourceFiles) {
      formData.append('image', sourceFile.file, sourceFile.name);
    }

    const response = await fetch('/api/openai/images/marketing-scene', {
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
