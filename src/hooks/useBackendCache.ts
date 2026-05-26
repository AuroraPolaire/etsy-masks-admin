import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBackendDraftAutosave } from './useBackendDraftAutosave';
import { BackendApiError, createBackendClient } from '../lib/backendClient';
import {
  loadActiveBackendDraftRunId,
  saveActiveBackendDraftRunId,
} from '../lib/backendDraftSession';
import { getProjectIdeaLabel } from '../lib/backendIdea';
import {
  downloadBackendRunFiles,
  getErrorMessage,
  getOversizedFiles,
  isAbortError,
  loadBackendRunCache,
  syncBackendRunFiles,
} from '../lib/backendSync';

import type { BackendRunCacheState } from '../lib/backendSync';
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
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [runs, setRuns] = useState<BackendRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [snapshot, setSnapshot] = useState<BackendProjectSnapshot | null>(null);
  const [saveIdea, setSaveIdea] = useState(suggestedIdea);
  const [lastSuggestedIdea, setLastSuggestedIdea] = useState(suggestedIdea);
  const [activeDraftRunId, setActiveDraftRunId] = useState(() =>
    loadActiveBackendDraftRunId(project.id),
  );
  const healthRef = useRef<BackendHealth | null>(null);
  const client = useMemo(() => createBackendClient(), []);
  const canUseOpenAIProxy = Boolean(health?.openaiProxyReady);
  const resolvedSaveIdea = saveIdea.trim() || suggestedIdea;

  const setActiveDraftRun = useCallback(
    (runId: string, projectId = project.id) => {
      setActiveDraftRunId(runId);
      saveActiveBackendDraftRunId(projectId, runId);
    },
    [project.id],
  );

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  useEffect(() => {
    setActiveDraftRunId(loadActiveBackendDraftRunId(project.id));
  }, [project.id]);

  useEffect(() => {
    const controller = new AbortController();

    void client
      .getHealth(controller.signal)
      .then(setHealth)
      .catch(() => {
        // Full connection diagnostics run from the Backend saves screen.
      });

    return () => controller.abort();
  }, [client]);

  useEffect(() => {
    setSaveIdea((currentIdea) =>
      currentIdea.trim().length === 0 || currentIdea === lastSuggestedIdea
        ? suggestedIdea
        : currentIdea,
    );
    setLastSuggestedIdea(suggestedIdea);
  }, [lastSuggestedIdea, suggestedIdea]);

  const applyRunCache = useCallback((nextCache: BackendRunCacheState) => {
    setHealth(nextCache.health);
    setRuns(nextCache.runs);
    setSelectedRunId(nextCache.selectedRunId);
    setSnapshot(nextCache.snapshot);
  }, []);

  const loadRunCache = useCallback(
    async (preferredRunId: string | undefined, context: BusyActionContext) =>
      applyRunCache(await loadBackendRunCache(client, preferredRunId, context)),
    [applyRunCache, client],
  );

  const syncRunToBackend = useCallback(
    async ({
      targetStatus,
      projectOverride = project,
      filesOverride = files,
      signal,
      setProgress,
      forceUpload = false,
    }: {
      targetStatus: 'draft' | 'final';
      projectOverride?: Project;
      filesOverride?: ManagedFile[];
      signal?: AbortSignal;
      setProgress?: (message: string | null) => void;
      forceUpload?: boolean;
    }): Promise<{ runId: string; snapshot: BackendProjectSnapshot }> => {
      setProgress?.('Checking Cloudflare backend limits...');
      const nextHealth = healthRef.current ?? (await client.getHealth(signal));
      setHealth(nextHealth);

      const oversizedFiles = getOversizedFiles(filesOverride, nextHealth.maxFileBytes);
      if (oversizedFiles.length > 0) {
        throw new Error(`${oversizedFiles.length} file(s) exceed the backend upload limit.`);
      }

      const idea = saveIdea.trim() || getProjectIdeaLabel(projectOverride);
      let runId = activeDraftRunId;

      if (runId) {
        try {
          setProgress?.(`Updating draft "${idea}" in D1...`);
          await client.updateRun(runId, projectOverride, idea, 'draft', signal);
        } catch (error) {
          if (!(error instanceof BackendApiError) || error.status !== 404) {
            throw error;
          }

          runId = '';
        }
      }

      if (!runId) {
        setProgress?.(`Creating draft run "${idea}" in D1...`);
        const { run } = await client.createRun(projectOverride, idea, 'draft', signal);
        runId = run.id;
      }

      let nextSnapshot = await syncBackendRunFiles(client, projectOverride, runId, filesOverride, {
        ...(signal ? { signal } : {}),
        ...(setProgress ? { setProgress } : {}),
        forceUpload,
      });
      if (targetStatus === 'final') {
        setProgress?.(`Marking "${idea}" as final...`);
        await client.finalizeRun(runId, projectOverride, idea, signal);
        nextSnapshot = await client.getRun(runId, signal);
      }

      const { runs: nextRuns } = await client.listRuns(signal);
      setRuns(nextRuns);
      setSelectedRunId(runId);
      setSnapshot(nextSnapshot);

      if (targetStatus === 'draft') {
        setActiveDraftRun(runId, projectOverride.id);
      } else {
        setActiveDraftRun('', projectOverride.id);
      }

      return { runId, snapshot: nextSnapshot };
    },
    [activeDraftRunId, client, files, project, saveIdea, setActiveDraftRun],
  );

  const syncDraftRun = useCallback(
    (signal: AbortSignal) =>
      syncRunToBackend({
        targetStatus: 'draft',
        signal,
      }),
    [syncRunToBackend],
  );

  const {
    autosaveState,
    markFinalSaved,
    markDraftRestored,
    markFinalRestored,
    clearAutosaveTracking,
  } = useBackendDraftAutosave({
    project,
    files,
    resolvedSaveIdea,
    activeDraftRunId,
    syncDraftRun,
  });

  const testConnection = useCallback(() => {
    void runBusyAction('backend-sync', async (context) => {
      try {
        await loadRunCache(selectedRunId || undefined, context);
        addActivity('cloud-synced', 'success', 'Cloudflare Worker and run cache are reachable.');
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
  }, [addActivity, loadRunCache, runBusyAction, selectedRunId]);

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

  const restoreRun = useCallback(
    (runId?: string) => {
      const targetRunId = runId ?? selectedRunId;

      void (async () => {
        if (!targetRunId) {
          addActivity('cloud-synced', 'warning', 'Select a saved backend run first.');
          return;
        }

        const selectedRun = runs.find((run) => run.id === targetRunId);
        const shouldRestore = await confirmAction({
          title: 'Restore selected run?',
          description: `This replaces the current browser project and session files with "${
            selectedRun?.idea ?? 'the selected Cloudflare run'
          }".`,
          confirmLabel: 'Restore run',
        });

        if (!shouldRestore) {
          return;
        }

        void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
          try {
            setSelectedRunId(targetRunId);
            setProgress('Reading selected run metadata...');
            const nextSnapshot = await client.getRun(targetRunId, signal);
            setSnapshot(nextSnapshot);

            if (!nextSnapshot.project) {
              addActivity('cloud-synced', 'warning', 'The selected run no longer exists.');
              return;
            }

            const restoredFiles = await downloadBackendRunFiles(client, targetRunId, nextSnapshot, {
              signal,
              setProgress,
            });

            replaceProject(nextSnapshot.project);
            replaceFiles(
              restoredFiles,
              `Restored ${restoredFiles.length} file(s) from Cloudflare.`,
            );
            const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);
            if (nextSnapshot.status === 'draft') {
              setActiveDraftRun(targetRunId, nextSnapshot.project.id);
              markDraftRestored(nextSnapshot.project, restoredFiles, restoredIdea, targetRunId);
            } else {
              setActiveDraftRun('', nextSnapshot.project.id);
              markFinalRestored(nextSnapshot.project, restoredFiles, restoredIdea);
            }
            addActivity(
              'cloud-synced',
              'success',
              `Restored "${nextSnapshot.idea ?? 'saved run'}".`,
            );
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
    },
    [
      addActivity,
      client,
      confirmAction,
      markDraftRestored,
      markFinalRestored,
      replaceFiles,
      replaceProject,
      runBusyAction,
      runs,
      selectedRunId,
      setActiveDraftRun,
    ],
  );

  const restoreSelectedRun = useCallback(() => {
    restoreRun();
  }, [restoreRun]);

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
          if (selectedRunId === activeDraftRunId) {
            setActiveDraftRun('', project.id);
            clearAutosaveTracking();
          }
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
  }, [
    activeDraftRunId,
    addActivity,
    client,
    confirmAction,
    clearAutosaveTracking,
    loadRunCache,
    project.id,
    runBusyAction,
    runs,
    selectedRunId,
    setActiveDraftRun,
  ]);

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
          setActiveDraftRun('', project.id);
          clearAutosaveTracking();
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
  }, [
    addActivity,
    clearAutosaveTracking,
    client,
    confirmAction,
    project.id,
    runBusyAction,
    setActiveDraftRun,
  ]);

  const finalizeCurrentRun = useCallback(
    async (projectOverride?: Project, context?: BusyActionContext): Promise<void> => {
      const finalProject = projectOverride ?? project;
      const finalIdea = saveIdea.trim() || getProjectIdeaLabel(finalProject);
      const { signal, setProgress } = context ?? {};

      const { runId } = await syncRunToBackend({
        targetStatus: 'final',
        projectOverride: finalProject,
        ...(signal ? { signal } : {}),
        ...(setProgress ? { setProgress } : {}),
        forceUpload: true,
      });
      markFinalSaved(finalProject, files, finalIdea);
      addActivity('cloud-synced', 'success', `Marked "${finalIdea}" as a final cloud run.`);
      await loadRunCache(runId, {
        signal: signal ?? new AbortController().signal,
        setProgress: setProgress ?? (() => undefined),
      });
    },
    [addActivity, files, loadRunCache, markFinalSaved, project, saveIdea, syncRunToBackend],
  );

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
    health,
    runs,
    selectedRunId,
    snapshot,
    activeDraftRunId,
    autosaveState,
    saveIdea,
    suggestedIdea,
    canUseOpenAIProxy,
    setSaveIdea,
    testConnection,
    selectRun,
    restoreSelectedRun,
    deleteSelectedRun,
    deleteAllCloudData,
    restoreRun,
    finalizeCurrentRun,
    generateProjectDraft,
    generateImage,
  };
};
