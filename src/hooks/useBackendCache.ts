import { useCallback, useEffect, useMemo, useState } from 'react';

import { createBackendClient } from '../lib/backendClient';
import {
  createManagedFileFromBackendRecord,
  managedFileToBackendMetadata,
} from '../lib/backendFiles';
import { getProjectIdeaLabel } from '../lib/backendIdea';

import type { BackendSettings } from '../components/BackendDataPanel';
import type {
  AddActivity,
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyActionContext,
  ManagedFile,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
  RunBusyAction,
} from '../types';

const BACKEND_API_BASE_URL_STORAGE_KEY = 'etsy-masks-admin/backend-api-base-url-v1';

type ConfirmAction = (request: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger';
}) => Promise<boolean>;

type UseBackendCacheParams = {
  project: Project;
  files: ManagedFile[];
  replaceProject: (project: Project) => void;
  replaceFiles: (files: ManagedFile[], activityMessage?: string) => void;
  addActivity: AddActivity;
  runBusyAction: RunBusyAction;
  confirmAction: ConfirmAction;
};

const readInitialBackendSettings = (): BackendSettings => {
  try {
    return {
      apiBaseUrl: window.localStorage.getItem(BACKEND_API_BASE_URL_STORAGE_KEY) ?? '',
      adminToken: '',
    };
  } catch {
    return {
      apiBaseUrl: '',
      adminToken: '',
    };
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useBackendCache = ({
  project,
  files,
  replaceProject,
  replaceFiles,
  addActivity,
  runBusyAction,
  confirmAction,
}: UseBackendCacheParams) => {
  const suggestedIdea = useMemo(() => getProjectIdeaLabel(project), [project]);
  const [settings, setSettingsState] = useState<BackendSettings>(readInitialBackendSettings);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [runs, setRuns] = useState<BackendRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [snapshot, setSnapshot] = useState<BackendProjectSnapshot | null>(null);
  const [saveIdea, setSaveIdea] = useState(suggestedIdea);
  const [lastSuggestedIdea, setLastSuggestedIdea] = useState(suggestedIdea);
  const client = useMemo(() => createBackendClient(settings), [settings]);
  const canUseOpenAIProxy = Boolean(
    settings.apiBaseUrl.trim() && settings.adminToken.trim() && health?.openaiProxyReady,
  );

  useEffect(() => {
    setSaveIdea((currentIdea) =>
      currentIdea.trim().length === 0 || currentIdea === lastSuggestedIdea
        ? suggestedIdea
        : currentIdea,
    );
    setLastSuggestedIdea(suggestedIdea);
  }, [lastSuggestedIdea, suggestedIdea]);

  const setSettings = useCallback((nextSettings: BackendSettings) => {
    setSettingsState(nextSettings);
    setHealth(null);
    setRuns([]);
    setSelectedRunId('');
    setSnapshot(null);

    try {
      window.localStorage.setItem(BACKEND_API_BASE_URL_STORAGE_KEY, nextSettings.apiBaseUrl);
    } catch {
      // The API URL is non-secret convenience state. Ignore storage failures.
    }
  }, []);

  const loadRunCache = useCallback(
    async (
      preferredRunId: string | undefined,
      { signal, setProgress }: BusyActionContext,
    ): Promise<void> => {
      setProgress('Checking Cloudflare Worker health...');
      const nextHealth = await client.getHealth(signal);
      setHealth(nextHealth);

      if (!settings.adminToken.trim()) {
        setRuns([]);
        setSelectedRunId('');
        setSnapshot(null);
        return;
      }

      setProgress('Reading saved runs from D1...');
      const { runs: nextRuns } = await client.listRuns(signal);
      setRuns(nextRuns);
      const runId =
        preferredRunId && nextRuns.some((run) => run.id === preferredRunId)
          ? preferredRunId
          : nextRuns[0]?.id;

      if (!runId) {
        setSelectedRunId('');
        setSnapshot(null);
        return;
      }

      setSelectedRunId(runId);
      setProgress('Reading selected run metadata...');
      setSnapshot(await client.getRun(runId, signal));
    },
    [client, settings.adminToken],
  );

  const testConnection = useCallback(() => {
    void runBusyAction('backend-sync', async (context) => {
      try {
        await loadRunCache(selectedRunId || undefined, context);
        addActivity(
          'cloud-synced',
          'success',
          settings.adminToken.trim()
            ? 'Cloudflare Worker and run cache are reachable.'
            : 'Cloudflare Worker is reachable. Add the admin token to read saved runs.',
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('cloud-synced', 'warning', 'Backend connection check was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          getErrorMessage(error, 'Could not connect to the Cloudflare backend.'),
        );
      }
    });
  }, [addActivity, loadRunCache, runBusyAction, selectedRunId, settings.adminToken]);

  const selectRun = useCallback(
    (runId: string) => {
      setSelectedRunId(runId);
      if (!runId) {
        setSnapshot(null);
        return;
      }

      void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
        try {
          setProgress('Reading selected run...');
          setSnapshot(await client.getRun(runId, signal));
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Run loading was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not load the selected backend run.'),
          );
        }
      });
    },
    [addActivity, client, runBusyAction],
  );

  const backupToCloud = useCallback(() => {
    void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
      try {
        setProgress('Checking Cloudflare backend limits...');
        const nextHealth = health ?? (await client.getHealth(signal));
        setHealth(nextHealth);
        const oversizedFiles = files.filter((file) => file.size > nextHealth.maxFileBytes);

        if (oversizedFiles.length > 0) {
          addActivity(
            'cloud-synced',
            'warning',
            `${oversizedFiles.length} file(s) exceed the backend upload limit.`,
          );
          return;
        }

        const idea = saveIdea.trim() || suggestedIdea;
        setProgress(`Saving "${idea}" metadata to D1...`);
        const { run } = await client.createRun(project, idea, signal);

        for (const [index, file] of files.entries()) {
          if (signal.aborted) {
            throw new DOMException('Backend backup cancelled', 'AbortError');
          }

          setProgress(`Uploading ${index + 1}/${files.length}: ${file.name}`);
          await client.uploadFile(
            run.id,
            managedFileToBackendMetadata(project, file),
            file.file,
            signal,
          );
        }

        await loadRunCache(run.id, { signal, setProgress });
        addActivity(
          'cloud-synced',
          'success',
          `Saved "${idea}" with ${files.length} file(s) to Cloudflare.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('cloud-synced', 'warning', 'Cloud backup was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          getErrorMessage(error, 'Could not save the run to Cloudflare.'),
        );
      }
    });
  }, [
    addActivity,
    client,
    files,
    health,
    loadRunCache,
    project,
    runBusyAction,
    saveIdea,
    suggestedIdea,
  ]);

  const restoreSelectedRun = useCallback(() => {
    void (async () => {
      if (!selectedRunId) {
        addActivity('cloud-synced', 'warning', 'Select a saved backend run first.');
        return;
      }

      const shouldRestore = await confirmAction({
        title: 'Restore selected run?',
        description:
          'This replaces the current browser project and session files with the selected Cloudflare run.',
        confirmLabel: 'Restore run',
      });

      if (!shouldRestore) {
        return;
      }

      void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
        try {
          setProgress('Reading selected run metadata...');
          const nextSnapshot = await client.getRun(selectedRunId, signal);
          setSnapshot(nextSnapshot);

          if (!nextSnapshot.project) {
            addActivity('cloud-synced', 'warning', 'The selected run no longer exists.');
            return;
          }

          const restoredFiles: ManagedFile[] = [];
          for (const [index, file] of nextSnapshot.files.entries()) {
            if (signal.aborted) {
              throw new DOMException('Backend restore cancelled', 'AbortError');
            }

            setProgress(`Downloading ${index + 1}/${nextSnapshot.files.length}: ${file.name}`);
            const blob = await client.downloadFile(selectedRunId, file.id, signal);
            restoredFiles.push(createManagedFileFromBackendRecord(file, blob));
          }

          replaceProject(nextSnapshot.project);
          replaceFiles(restoredFiles, `Restored ${restoredFiles.length} file(s) from Cloudflare.`);
          addActivity('cloud-synced', 'success', `Restored "${nextSnapshot.idea ?? 'saved run'}".`);
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Cloud restore was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not restore the selected Cloudflare run.'),
          );
        }
      });
    })();
  }, [
    addActivity,
    client,
    confirmAction,
    replaceFiles,
    replaceProject,
    runBusyAction,
    selectedRunId,
  ]);

  const deleteSelectedRun = useCallback(() => {
    void (async () => {
      if (!selectedRunId) {
        addActivity('cloud-synced', 'warning', 'Select a saved backend run first.');
        return;
      }

      const selectedRun = runs.find((run) => run.id === selectedRunId);
      const shouldDelete = await confirmAction({
        title: 'Delete selected run?',
        description: `This deletes "${selectedRun?.idea ?? 'the selected run'}" from D1 and R2.`,
        confirmLabel: 'Delete run',
        tone: 'danger',
      });

      if (!shouldDelete) {
        return;
      }

      void runBusyAction('backend-sync', async (context) => {
        try {
          context.setProgress('Deleting selected Cloudflare run...');
          await client.deleteRun(selectedRunId, context.signal);
          await loadRunCache(undefined, context);
          addActivity('cloud-synced', 'warning', 'Deleted the selected Cloudflare run.');
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Run deletion was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not delete the selected Cloudflare run.'),
          );
        }
      });
    })();
  }, [addActivity, client, confirmAction, loadRunCache, runBusyAction, runs, selectedRunId]);

  const deleteAllCloudData = useCallback(() => {
    void (async () => {
      const shouldDelete = await confirmAction({
        title: 'Delete all Cloudflare data?',
        description:
          'This deletes every saved run, D1 project metadata, file metadata, event log, and R2 file object. Local browser data is not changed.',
        confirmLabel: 'Delete all cloud data',
        tone: 'danger',
      });

      if (!shouldDelete) {
        return;
      }

      void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
        try {
          setProgress('Deleting all Cloudflare data...');
          await client.deleteProject(signal);
          setRuns([]);
          setSelectedRunId('');
          setSnapshot(null);
          addActivity('cloud-synced', 'warning', 'Deleted all Cloudflare backend data.');
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Cloud deletion was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not delete Cloudflare backend data.'),
          );
        }
      });
    })();
  }, [addActivity, client, confirmAction, runBusyAction]);

  const generateProjectDraft = useCallback(
    (initialPrompt: string, signal?: AbortSignal): Promise<ProjectDraft> =>
      client.generateProjectDraft(initialPrompt, signal),
    [client],
  );

  const generateImage = useCallback(
    (settings: OpenAIImageSettings, prompt: PromptItem, signal?: AbortSignal): Promise<File> =>
      client.generateImage(settings, prompt, signal),
    [client],
  );

  return {
    settings,
    health,
    runs,
    selectedRunId,
    snapshot,
    saveIdea,
    suggestedIdea,
    canUseOpenAIProxy,
    setSettings,
    setSaveIdea,
    testConnection,
    selectRun,
    backupToCloud,
    restoreSelectedRun,
    deleteSelectedRun,
    deleteAllCloudData,
    generateProjectDraft,
    generateImage,
  };
};
