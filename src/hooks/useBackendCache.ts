import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getInitialBackendDraftRestoreStatus,
  shouldPauseBackendDraftAutosave,
  useBackendDraftAutoRestore,
} from './useBackendDraftAutoRestore';
import { useBackendDraftAutosave } from './useBackendDraftAutosave';
import { BackendApiError, createBackendClient } from '../lib/backendClient';
import {
  loadActiveBackendDraftRunId,
  saveActiveBackendDraftRunId,
} from '../lib/backendDraftSession';
import { getProjectIdeaLabel } from '../lib/backendIdea';
import {
  getBackendRestoreNowMs,
  logBackendRestoreInstrumentation,
} from '../lib/backendRestoreInstrumentation';
import {
  downloadBackendRunFiles,
  findReusableBackendDraftRun,
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
  EtsySeoAnalysis,
  ManagedFile,
  MarketingImageSettings,
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
  appendFiles: (files: ManagedFile[]) => void;
  addActivity: AddActivity;
  runBusyAction: RunBusyAction;
  confirmAction: ConfirmAction;
};

export const useBackendCache = ({
  project,
  files,
  replaceProject,
  replaceFiles,
  appendFiles,
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
  const [initialActiveDraftRunId] = useState(() => loadActiveBackendDraftRunId(project.id));
  const [activeDraftRunId, setActiveDraftRunId] = useState(initialActiveDraftRunId);
  const [draftRestoreStatus, setDraftRestoreStatus] = useState(() =>
    getInitialBackendDraftRestoreStatus(),
  );
  const healthRef = useRef<BackendHealth | null>(null);
  const client = useMemo(() => createBackendClient(), []);
  const canUseOpenAIProxy = Boolean(health?.openaiProxyReady);
  const resolvedSaveIdea = saveIdea.trim() || suggestedIdea;
  const shouldPauseDraftAutosave = shouldPauseBackendDraftAutosave(draftRestoreStatus);
  const previousProjectIdRef = useRef(project.id);

  const setActiveDraftRun = useCallback(
    (runId: string, projectId = project.id) => {
      setActiveDraftRunId(runId);
      saveActiveBackendDraftRunId(projectId, runId);
      if (!runId) {
        setDraftRestoreStatus('complete');
      }
    },
    [project.id],
  );

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  useEffect(() => {
    if (previousProjectIdRef.current === project.id) {
      return;
    }

    previousProjectIdRef.current = project.id;
    const nextRunId = loadActiveBackendDraftRunId(project.id);
    setActiveDraftRunId(nextRunId);
    setDraftRestoreStatus('restoring');
  }, [project.id]);

  useEffect(() => {
    const controller = new AbortController();

    void client
      .getHealth(controller.signal)
      .then(setHealth)
      .catch(() => {
        // Full connection diagnostics run from the Cloud screen.
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
      projectOverride = project,
      filesOverride = files,
      signal,
      setProgress,
      forceUpload = false,
    }: {
      projectOverride?: Project;
      filesOverride?: ManagedFile[];
      signal?: AbortSignal;
      setProgress?: (message: string | null) => void;
      forceUpload?: boolean;
    }): Promise<{ runId: string; snapshot: BackendProjectSnapshot }> => {
      setProgress?.('Checking cloud upload limits...');
      const nextHealth = healthRef.current ?? (await client.getHealth(signal));
      setHealth(nextHealth);

      const oversizedFiles = getOversizedFiles(filesOverride, nextHealth.maxFileBytes);
      if (oversizedFiles.length > 0) {
        throw new Error(`${oversizedFiles.length} file(s) exceed the cloud upload limit.`);
      }

      const idea = saveIdea.trim() || getProjectIdeaLabel(projectOverride);
      let runId = activeDraftRunId;
      let reusedExistingRun = false;

      if (runId) {
        try {
          setProgress?.(`Updating draft "${idea}" in D1...`);
          await client.updateRun(runId, projectOverride, idea, signal);
        } catch (error) {
          if (!(error instanceof BackendApiError) || error.status !== 404) {
            throw error;
          }

          runId = '';
        }
      }

      if (!runId) {
        setProgress?.('Checking for an existing draft for this project...');
        const { runs: existingRuns } = await client.listRuns(signal);
        const reusableRun = findReusableBackendDraftRun(existingRuns, projectOverride.id);

        if (reusableRun) {
          reusedExistingRun = true;
          runId = reusableRun.id;
          setProgress?.(`Updating existing draft "${idea}" in D1...`);
          await client.updateRun(runId, projectOverride, idea, signal);
        } else {
          setProgress?.(`Creating draft run "${idea}" in D1...`);
          const { run } = await client.createRun(projectOverride, idea, signal);
          runId = run.id;
        }
      }

      const nextSnapshot =
        reusedExistingRun && filesOverride.length === 0
          ? await client.getRun(runId, signal)
          : await syncBackendRunFiles(client, projectOverride, runId, filesOverride, {
              ...(signal ? { signal } : {}),
              ...(setProgress ? { setProgress } : {}),
              forceUpload,
            });

      const { runs: nextRuns } = await client.listRuns(signal);
      setRuns(nextRuns);
      setSelectedRunId(runId);
      setSnapshot(nextSnapshot);
      setActiveDraftRun(runId, projectOverride.id);

      return { runId, snapshot: nextSnapshot };
    },
    [activeDraftRunId, client, files, project, saveIdea, setActiveDraftRun],
  );

  const syncDraftRun = useCallback(
    (signal: AbortSignal) =>
      syncRunToBackend({
        signal,
      }),
    [syncRunToBackend],
  );

  const {
    autosaveState,
    markDraftRestored,
    markDraftRestoreFailed,
    clearAutosaveTracking,
    markCurrentStateDeleted,
  } = useBackendDraftAutosave({
    project,
    files,
    resolvedSaveIdea,
    activeDraftRunId,
    pauseAutosave: shouldPauseDraftAutosave,
    isRestoringDraft: draftRestoreStatus === 'restoring',
    syncDraftRun,
  });

  useBackendDraftAutoRestore({
    client,
    initialDraftRunId: initialActiveDraftRunId,
    activeDraftRunId,
    currentProjectId: project.id,
    addActivity,
    replaceProject,
    replaceFiles,
    appendFiles,
    setActiveDraftRun,
    setSaveIdea,
    setSelectedRunId,
    setSnapshot,
    markDraftRestored,
    markDraftRestoreFailed,
    clearAutosaveTracking,
    setRestoreStatus: setDraftRestoreStatus,
  });

  const testConnection = useCallback(() => {
    void runBusyAction('backend-sync', async (context) => {
      try {
        await loadRunCache(selectedRunId || undefined, context);
        addActivity('cloud-synced', 'success', 'Cloudflare Worker and run cache are reachable.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('cloud-synced', 'warning', 'Cloud connection check was cancelled.');
          return;
        }

        addActivity('error', 'error', getErrorMessage(error, 'Could not connect to Cloudflare.'));
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
            getErrorMessage(error, 'Could not load the selected cloud run.'),
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
          addActivity('cloud-synced', 'warning', 'Select a saved cloud run first.');
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
            const restoreStartedAt = getBackendRestoreNowMs();
            let firstFileAppendedMs: number | null = null;
            setDraftRestoreStatus('restoring');
            setSelectedRunId(targetRunId);
            setProgress('Reading selected run metadata...');
            const metadataStartedAt = getBackendRestoreNowMs();
            const nextSnapshot = await client.getRun(targetRunId, signal);
            const metadataFetchMs = getBackendRestoreNowMs() - metadataStartedAt;
            setSnapshot(nextSnapshot);

            if (!nextSnapshot.project) {
              addActivity('cloud-synced', 'warning', 'The selected run no longer exists.');
              return;
            }

            const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);

            setActiveDraftRun(targetRunId, nextSnapshot.project.id);
            setSaveIdea(restoredIdea);
            replaceProject(nextSnapshot.project);
            replaceFiles([]);

            const result = await downloadBackendRunFiles(client, targetRunId, nextSnapshot, {
              signal,
              setProgress,
              onFileRestored: (file) => {
                firstFileAppendedMs ??= getBackendRestoreNowMs() - restoreStartedAt;
                appendFiles([file]);
              },
            });
            logBackendRestoreInstrumentation({
              label: 'manual',
              metadataFetchMs,
              firstFileAppendedMs,
              totalRestoreMs: getBackendRestoreNowMs() - restoreStartedAt,
              result,
            });

            if (result.cancelled || result.failedFiles.length > 0) {
              const message = result.cancelled
                ? 'Cloud restore was cancelled. Autosave is paused to protect cloud files.'
                : `Restored ${result.files.length}/${nextSnapshot.files.length} file(s); ${result.failedFiles.length} failed. Autosave is paused to protect cloud files.`;
              markDraftRestoreFailed(message, targetRunId);
              setDraftRestoreStatus('failed');
              addActivity(
                result.cancelled ? 'cloud-synced' : 'error',
                result.cancelled ? 'warning' : 'error',
                message,
              );
              return;
            }

            await client.updateRun(targetRunId, nextSnapshot.project, restoredIdea, signal);
            markDraftRestored(nextSnapshot.project, result.files, restoredIdea, targetRunId);
            setDraftRestoreStatus('complete');
            addActivity(
              'cloud-synced',
              'success',
              `Restored ${result.files.length} file(s) from "${nextSnapshot.idea ?? 'saved run'}".`,
            );
          } catch (error) {
            if (isAbortError(error)) {
              setDraftRestoreStatus('complete');
              addActivity('cloud-synced', 'warning', 'Cloud restore was cancelled.');
              return;
            }

            const message = getErrorMessage(
              error,
              'Could not restore the selected Cloudflare run.',
            );
            markDraftRestoreFailed(message, targetRunId);
            setDraftRestoreStatus('failed');
            addActivity('error', 'error', message);
          }
        });
      })();
    },
    [
      addActivity,
      appendFiles,
      client,
      confirmAction,
      markDraftRestored,
      markDraftRestoreFailed,
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

  const deleteRun = useCallback(
    (runId: string) => {
      void (async () => {
        if (!runId) {
          addActivity('cloud-synced', 'warning', 'Choose a saved cloud run first.');
          return;
        }

        const selectedRun = runs.find((run) => run.id === runId);
        const shouldDelete = await confirmAction({
          title: 'Delete saved run?',
          description: `This deletes "${selectedRun?.idea ?? 'the selected run'}" from D1 and R2.`,
          confirmLabel: 'Delete run',
          tone: 'danger',
        });

        if (!shouldDelete) {
          return;
        }

        void runBusyAction('backend-sync', async (context) => {
          try {
            context.setProgress('Deleting Cloudflare run...');
            await client.deleteRun(runId, context.signal);
            if (runId === activeDraftRunId) {
              setActiveDraftRun('', project.id);
              markCurrentStateDeleted(project, files, resolvedSaveIdea);
            }
            const { runs: nextRuns } = await client.listRuns(context.signal);
            setRuns(nextRuns);
            if (runId === selectedRunId) {
              setSelectedRunId('');
              setSnapshot(null);
            }
            addActivity('cloud-synced', 'warning', 'Deleted the saved Cloudflare run.');
          } catch (error) {
            if (isAbortError(error)) {
              addActivity('cloud-synced', 'warning', 'Run deletion was cancelled.');
              return;
            }

            addActivity(
              'error',
              'error',
              getErrorMessage(error, 'Could not delete the Cloudflare run.'),
            );
          }
        });
      })();
    },
    [
      activeDraftRunId,
      addActivity,
      client,
      confirmAction,
      files,
      markCurrentStateDeleted,
      project,
      resolvedSaveIdea,
      runBusyAction,
      runs,
      selectedRunId,
      setActiveDraftRun,
    ],
  );

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
          markCurrentStateDeleted(project, files, resolvedSaveIdea);
          addActivity('cloud-synced', 'warning', 'Deleted all Cloudflare data.');
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Cloud deletion was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not delete Cloudflare data.'),
          );
        }
      });
    })();
  }, [
    addActivity,
    client,
    confirmAction,
    files,
    markCurrentStateDeleted,
    project,
    resolvedSaveIdea,
    runBusyAction,
    setActiveDraftRun,
  ]);

  const generateProjectDraft = useCallback(
    (initialPrompt: string, signal?: AbortSignal): Promise<ProjectDraft> =>
      client.generateProjectDraft(initialPrompt, signal),
    [client],
  );

  const generateEtsySeoAnalysis = useCallback(
    (
      projectOverride: Project,
      filesOverride: ManagedFile[],
      signal?: AbortSignal,
    ): Promise<EtsySeoAnalysis> =>
      client.generateEtsySeoAnalysis(projectOverride, filesOverride, signal),
    [client],
  );

  const generateImage = useCallback(
    (settings: OpenAIImageSettings, prompt: PromptItem, signal?: AbortSignal): Promise<File> =>
      client.generateImage(settings, prompt, signal),
    [client],
  );

  const generateColoringPageImage = useCallback(
    (
      settings: OpenAIImageSettings,
      prompt: PromptItem,
      sourceFile: File,
      signal?: AbortSignal,
    ): Promise<File> => client.generateColoringPageImage(settings, prompt, sourceFile, signal),
    [client],
  );

  const generateMarketingSceneImage = useCallback(
    (
      settings: MarketingImageSettings,
      projectOverride: Project,
      sourceFiles: ManagedFile[],
      recipe: { id: string; optionIndex: number; stage: 'preview' | 'final'; maskCount: number },
      signal?: AbortSignal,
    ): Promise<File> =>
      client.generateMarketingSceneImage(settings, projectOverride, sourceFiles, recipe, signal),
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
    deleteRun,
    deleteAllCloudData,
    restoreRun,
    generateProjectDraft,
    generateEtsySeoAnalysis,
    generateImage,
    generateColoringPageImage,
    generateMarketingSceneImage,
  };
};
