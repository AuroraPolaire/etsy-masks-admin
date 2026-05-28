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
  findUsableBackendDraftRun,
  getErrorMessage,
  getOversizedFiles,
  isAbortError,
  loadBackendRunCache,
  syncBackendRunFiles,
} from '../lib/backendSync';
import { discardGeneratedFileBackups } from '../lib/generatedFileRecovery';
import {
  createAutosaveRevisionInput,
  inferRunRevisionStage,
  isRunRevisionSummary,
} from '../lib/runHistory';

import type { BackendRunCacheState } from '../lib/backendSync';
import type {
  AddActivity,
  BackendHealth,
  BackendProjectSnapshot,
  BackendRunSummary,
  BriefReferenceImage,
  BusyActionContext,
  EtsySeoAnalysis,
  ManagedFile,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
  RunRevisionSummary,
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
  const [runRevisions, setRunRevisions] = useState<RunRevisionSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
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
  const currentProjectIdRef = useRef(project.id);
  const previousProjectIdRef = useRef(project.id);
  const hasLoadedRunCacheRef = useRef(false);
  const isLoadingRunCacheRef = useRef(false);

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
    currentProjectIdRef.current = project.id;
  }, [project.id]);

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
        // Full connection diagnostics run from the saved-work screen.
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
    hasLoadedRunCacheRef.current = true;
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

  const refreshRunHistory = useCallback(
    async (runId: string, signal?: AbortSignal) => {
      if (!runId) {
        setRunRevisions([]);
        return;
      }

      setHistoryBusy(true);
      try {
        const { revisions } = await client.listRunRevisions(runId, signal);
        setRunRevisions(Array.isArray(revisions) ? revisions.filter(isRunRevisionSummary) : []);
        setHistoryError(null);
      } catch (error) {
        if (!isAbortError(error)) {
          const message = getErrorMessage(error, 'Could not load run history.');
          setHistoryError(message);
        }
      } finally {
        setHistoryBusy(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (!activeDraftRunId) {
      setRunRevisions([]);
      setHistoryError(null);
      return;
    }

    const controller = new AbortController();
    void refreshRunHistory(activeDraftRunId, controller.signal);
    return () => controller.abort();
  }, [activeDraftRunId, refreshRunHistory]);

  const createRevisionCheckpoint = useCallback(
    async (
      runId: string,
      projectOverride: Project,
      filesOverride: ManagedFile[],
      {
        signal,
        label,
        isManual = false,
        isPinned = false,
      }: {
        signal?: AbortSignal;
        label?: string;
        isManual?: boolean;
        isPinned?: boolean;
      } = {},
    ) => {
      if (!runId) {
        return null;
      }

      const checkpointLabel = label?.trim();
      const input = isManual
        ? {
            stage: inferRunRevisionStage(projectOverride, filesOverride),
            kind: 'manual' as const,
            label:
              checkpointLabel && checkpointLabel.length > 0 ? checkpointLabel : 'Saved version',
            description: 'Version saved from the workflow sidebar.',
            isManual: true,
            isPinned,
          }
        : createAutosaveRevisionInput(projectOverride, filesOverride);

      try {
        const { revision } = await client.createRunRevision(runId, input, signal);
        if (!isRunRevisionSummary(revision)) {
          return null;
        }

        setRunRevisions((currentRevisions) => [
          revision,
          ...currentRevisions.filter((item) => item.id !== revision.id),
        ]);
        setHistoryError(null);
        return revision;
      } catch (error) {
        if (isAbortError(error)) {
          return null;
        }

        const message = getErrorMessage(error, 'Could not save this version.');
        setHistoryError(message);
        addActivity('cloud-synced', 'warning', message);
        return null;
      }
    },
    [addActivity, client],
  );

  const syncRunToBackend = useCallback(
    async ({
      projectOverride = project,
      filesOverride = files,
      signal,
      setProgress,
      forceUpload = false,
      deleteMissingRemoteFiles = true,
    }: {
      projectOverride?: Project;
      filesOverride?: ManagedFile[];
      signal?: AbortSignal;
      setProgress?: (message: string | null) => void;
      forceUpload?: boolean;
      deleteMissingRemoteFiles?: boolean;
    }): Promise<{ runId: string; snapshot: BackendProjectSnapshot }> => {
      setProgress?.('Checking online save limits...');
      const nextHealth = healthRef.current ?? (await client.getHealth(signal));
      setHealth(nextHealth);

      const oversizedFiles = getOversizedFiles(filesOverride, nextHealth.maxFileBytes);
      if (oversizedFiles.length > 0) {
        throw new Error(`${oversizedFiles.length} file(s) exceed the online save limit.`);
      }

      const idea = saveIdea.trim() || getProjectIdeaLabel(projectOverride);
      let runId = activeDraftRunId;
      let reusedExistingRun = false;
      let existingRuns: BackendRunSummary[] | null = null;

      if (runId) {
        setProgress?.('Checking active draft ownership...');
        existingRuns = (await client.listRuns(signal)).runs;
        const usableRun = findUsableBackendDraftRun(existingRuns, runId, projectOverride.id);
        if (usableRun?.id !== runId) {
          reusedExistingRun = Boolean(usableRun);
          runId = usableRun?.id ?? '';
        }
      }

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
        existingRuns ??= (await client.listRuns(signal)).runs;
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
              deleteMissingRemoteFiles,
            });
      if (filesOverride.length > 0) {
        await discardGeneratedFileBackups(filesOverride.map((file) => file.id)).catch(() => {
          // Cloud is authoritative after a successful sync; stale local recovery can be cleaned later.
        });
      }

      if (currentProjectIdRef.current === projectOverride.id) {
        const { runs: nextRuns } = await client.listRuns(signal);
        setRuns(nextRuns);
        setSelectedRunId(runId);
        setSnapshot(nextSnapshot);
        setActiveDraftRun(runId, projectOverride.id);
      }

      return { runId, snapshot: nextSnapshot };
    },
    [activeDraftRunId, client, files, project, saveIdea, setActiveDraftRun],
  );

  const syncDraftRun = useCallback(
    async (signal: AbortSignal) => {
      const result = await syncRunToBackend({
        signal,
      });
      await createRevisionCheckpoint(result.runId, project, files, { signal });
      return result;
    },
    [createRevisionCheckpoint, files, project, syncRunToBackend],
  );

  const {
    autosaveState,
    markDraftSaved,
    markDraftRestored,
    markDraftRestoreFailed,
    clearAutosaveTracking,
    markCurrentStateDeleted,
    requestAutosaveRetry,
  } = useBackendDraftAutosave({
    project,
    files,
    resolvedSaveIdea,
    activeDraftRunId,
    pauseAutosave: shouldPauseDraftAutosave,
    isRestoringDraft: draftRestoreStatus === 'restoring',
    syncDraftRun,
  });

  const saveDraftNow = useCallback(
    async ({
      projectOverride = project,
      filesOverride = files,
      signal,
      setProgress,
      deleteMissingRemoteFiles = true,
      checkpointLabel,
      manualCheckpoint = false,
    }: {
      projectOverride?: Project;
      filesOverride?: ManagedFile[];
      signal?: AbortSignal;
      setProgress?: (message: string | null) => void;
      deleteMissingRemoteFiles?: boolean;
      checkpointLabel?: string;
      manualCheckpoint?: boolean;
    } = {}): Promise<{ runId: string; snapshot: BackendProjectSnapshot }> => {
      const idea = saveIdea.trim() || getProjectIdeaLabel(projectOverride);
      const result = await syncRunToBackend({
        projectOverride,
        filesOverride,
        ...(signal ? { signal } : {}),
        ...(setProgress ? { setProgress } : {}),
        deleteMissingRemoteFiles,
      });

      if (currentProjectIdRef.current === projectOverride.id) {
        markDraftSaved(projectOverride, filesOverride, idea, result.runId);
      }
      await createRevisionCheckpoint(result.runId, projectOverride, filesOverride, {
        ...(signal ? { signal } : {}),
        ...(checkpointLabel ? { label: checkpointLabel } : {}),
        isManual: manualCheckpoint,
        isPinned: manualCheckpoint,
      });
      return result;
    },
    [createRevisionCheckpoint, files, markDraftSaved, project, saveIdea, syncRunToBackend],
  );

  const startFreshDraft = useCallback(
    (projectId: string) => {
      setActiveDraftRun('', projectId);
      clearAutosaveTracking();
    },
    [clearAutosaveTracking, setActiveDraftRun],
  );

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

  const loadSavedRuns = useCallback(
    ({ force = false, showSuccess = false } = {}) => {
      if (!force && hasLoadedRunCacheRef.current) {
        return;
      }
      if (isLoadingRunCacheRef.current) {
        return;
      }

      isLoadingRunCacheRef.current = true;
      void runBusyAction('backend-sync', async (context) => {
        try {
          await loadRunCache(selectedRunId || undefined, context);
          if (showSuccess) {
            addActivity('cloud-synced', 'success', 'Online save and saved projects are reachable.');
          }
        } catch (error) {
          if (isAbortError(error)) {
            if (showSuccess) {
              addActivity('cloud-synced', 'warning', 'Online save check was cancelled.');
            }
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not connect to online save.'),
          );
        } finally {
          isLoadingRunCacheRef.current = false;
        }
      });
    },
    [addActivity, loadRunCache, runBusyAction, selectedRunId],
  );

  const testConnection = useCallback(() => {
    loadSavedRuns({ force: true, showSuccess: true });
  }, [loadSavedRuns]);

  const ensureSavedRunsLoaded = useCallback(() => {
    loadSavedRuns();
  }, [loadSavedRuns]);

  const selectRun = useCallback(
    (runId: string) => {
      setSelectedRunId(runId);
      if (!runId) {
        setSnapshot(null);
        return;
      }

      void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
        try {
          setProgress('Reading selected project...');
          setSnapshot(await client.getRun(runId, signal));
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Project loading was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not load the selected project.'),
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
          addActivity('cloud-synced', 'warning', 'Select a saved project first.');
          return;
        }

        const selectedRun = runs.find((run) => run.id === targetRunId);
        const shouldRestore = await confirmAction({
          title: 'Load selected project?',
          description: `This replaces the current browser project and session files with "${
            selectedRun?.idea ?? 'the selected saved project'
          }".`,
          confirmLabel: 'Load project',
        });

        if (!shouldRestore) {
          return;
        }

        void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
          try {
            const restoreStartedAt = getBackendRestoreNowMs();
            let firstFileAppendedMs: number | null = null;

            if (files.length > 0 && targetRunId !== activeDraftRunId) {
              setProgress('Saving current project before loading saved work...');
              const idea = saveIdea.trim() || getProjectIdeaLabel(project);
              const savedRun = await syncRunToBackend({
                projectOverride: project,
                filesOverride: files,
                signal,
                setProgress: (message) => {
                  setProgress(
                    message ? `Saving current project before loading saved work: ${message}` : null,
                  );
                },
              });
              markDraftSaved(project, files, idea, savedRun.runId);
            }

            setDraftRestoreStatus('restoring');
            setSelectedRunId(targetRunId);
            setProgress('Reading selected project details...');
            const metadataStartedAt = getBackendRestoreNowMs();
            const nextSnapshot = await client.getRun(targetRunId, signal);
            const metadataFetchMs = getBackendRestoreNowMs() - metadataStartedAt;
            setSnapshot(nextSnapshot);

            if (!nextSnapshot.project) {
              addActivity('cloud-synced', 'warning', 'The selected project no longer exists.');
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
                ? 'Project load was cancelled. Autosave is paused to protect saved files.'
                : `Loaded ${result.files.length}/${nextSnapshot.files.length} file(s); ${result.failedFiles.length} failed. Autosave is paused to protect saved files.`;
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
              `Loaded ${result.files.length} file(s) from "${nextSnapshot.idea ?? 'saved project'}".`,
            );
          } catch (error) {
            if (isAbortError(error)) {
              setDraftRestoreStatus('complete');
              addActivity('cloud-synced', 'warning', 'Project load was cancelled.');
              return;
            }

            const message = getErrorMessage(error, 'Could not load the selected project.');
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
      activeDraftRunId,
      client,
      confirmAction,
      files,
      markDraftSaved,
      markDraftRestored,
      markDraftRestoreFailed,
      project,
      replaceFiles,
      replaceProject,
      runBusyAction,
      runs,
      saveIdea,
      selectedRunId,
      setActiveDraftRun,
      syncRunToBackend,
    ],
  );

  const restoreSelectedRun = useCallback(() => {
    restoreRun();
  }, [restoreRun]);

  const restoreRevision = useCallback(
    (revisionId: string) => {
      void (async () => {
        const targetRunId = activeDraftRunId || selectedRunId;
        if (!targetRunId) {
          addActivity('cloud-synced', 'warning', 'Save this project before loading a version.');
          return;
        }

        const revision = runRevisions.find((item) => item.id === revisionId);
        const shouldRestore = await confirmAction({
          title: 'Load this version?',
          description: `This replaces the current browser project and session files with "${
            revision?.label ?? 'the selected version'
          }". Before loading it, the app saves your current work so you can return to it.`,
          confirmLabel: 'Load version',
        });

        if (!shouldRestore) {
          return;
        }

        void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
          try {
            setProgress('Saving current work before loading the version...');
            await saveDraftNow({
              signal,
              setProgress: (message) => {
                setProgress(message ? `Saving current state: ${message}` : null);
              },
              checkpointLabel: 'Before loading older version',
            });

            setDraftRestoreStatus('restoring');
            setProgress('Loading saved version metadata...');
            const restoreStartedAt = getBackendRestoreNowMs();
            const { snapshot: nextSnapshot } = await client.restoreRunRevision(
              targetRunId,
              revisionId,
              'full',
              signal,
            );
            setSnapshot(nextSnapshot);

            if (!nextSnapshot.project) {
              addActivity('cloud-synced', 'warning', 'The selected version no longer exists.');
              return;
            }

            const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);
            setActiveDraftRun(targetRunId, nextSnapshot.project.id);
            setSelectedRunId(targetRunId);
            setSaveIdea(restoredIdea);
            replaceProject(nextSnapshot.project);
            replaceFiles([]);

            const metadataFetchMs = getBackendRestoreNowMs() - restoreStartedAt;
            let firstFileAppendedMs: number | null = null;
            const result = await downloadBackendRunFiles(client, targetRunId, nextSnapshot, {
              signal,
              setProgress,
              onFileRestored: (file) => {
                firstFileAppendedMs ??= getBackendRestoreNowMs() - restoreStartedAt;
                appendFiles([file]);
              },
            });
            logBackendRestoreInstrumentation({
              label: 'revision',
              metadataFetchMs,
              firstFileAppendedMs,
              totalRestoreMs: getBackendRestoreNowMs() - restoreStartedAt,
              result,
            });

            if (result.cancelled || result.failedFiles.length > 0) {
              const message = result.cancelled
                ? 'Version load was cancelled. Autosave is paused to protect saved files.'
                : `Loaded ${result.files.length}/${nextSnapshot.files.length} file(s) from the selected version; ${result.failedFiles.length} failed. Autosave is paused to protect saved files.`;
              markDraftRestoreFailed(message, targetRunId);
              setDraftRestoreStatus('failed');
              addActivity(
                result.cancelled ? 'cloud-synced' : 'error',
                result.cancelled ? 'warning' : 'error',
                message,
              );
              return;
            }

            markDraftRestored(nextSnapshot.project, result.files, restoredIdea, targetRunId);
            setDraftRestoreStatus('complete');
            await refreshRunHistory(targetRunId, signal);
            addActivity(
              'cloud-synced',
              'success',
              `Loaded version "${revision?.label ?? 'selected version'}".`,
            );
          } catch (error) {
            if (isAbortError(error)) {
              setDraftRestoreStatus('complete');
              addActivity('cloud-synced', 'warning', 'Version load was cancelled.');
              return;
            }

            const message = getErrorMessage(error, 'Could not load the selected version.');
            markDraftRestoreFailed(message, targetRunId);
            setDraftRestoreStatus('failed');
            addActivity('error', 'error', message);
          }
        });
      })();
    },
    [
      activeDraftRunId,
      addActivity,
      appendFiles,
      client,
      confirmAction,
      markDraftRestored,
      markDraftRestoreFailed,
      refreshRunHistory,
      replaceFiles,
      replaceProject,
      runBusyAction,
      runRevisions,
      saveDraftNow,
      selectedRunId,
      setActiveDraftRun,
    ],
  );

  const deleteRun = useCallback(
    (runId: string) => {
      void (async () => {
        if (!runId) {
          addActivity('cloud-synced', 'warning', 'Choose a saved project first.');
          return;
        }

        const selectedRun = runs.find((run) => run.id === runId);
        const shouldDelete = await confirmAction({
          title: 'Delete saved project?',
          description: `This permanently deletes "${selectedRun?.idea ?? 'the selected project'}" and its stored files.`,
          confirmLabel: 'Delete project',
          tone: 'danger',
        });

        if (!shouldDelete) {
          return;
        }

        void runBusyAction('backend-sync', async (context) => {
          try {
            context.setProgress('Deleting saved project...');
            await client.deleteRun(runId, context.signal);
            if (runId === activeDraftRunId) {
              setActiveDraftRun('', project.id);
              markCurrentStateDeleted(project, files, resolvedSaveIdea);
              setRunRevisions([]);
            }
            const { runs: nextRuns } = await client.listRuns(context.signal);
            setRuns(nextRuns);
            if (runId === selectedRunId) {
              setSelectedRunId('');
              setSnapshot(null);
            }
            addActivity('cloud-synced', 'warning', 'Deleted the saved project.');
          } catch (error) {
            if (isAbortError(error)) {
              addActivity('cloud-synced', 'warning', 'Project deletion was cancelled.');
              return;
            }

            addActivity(
              'error',
              'error',
              getErrorMessage(error, 'Could not delete the saved project.'),
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
        title: 'Delete all saved work?',
        description:
          'This deletes every saved project, file, and previous version stored online. Local browser data is not changed.',
        confirmLabel: 'Delete all saved work',
        tone: 'danger',
      });

      if (!shouldDelete) {
        return;
      }

      void runBusyAction('backend-sync', async ({ setProgress, signal }) => {
        try {
          setProgress('Deleting all saved work...');
          await client.deleteProject(signal);
          setRuns([]);
          setSelectedRunId('');
          setSnapshot(null);
          setRunRevisions([]);
          setActiveDraftRun('', project.id);
          markCurrentStateDeleted(project, files, resolvedSaveIdea);
          addActivity('cloud-synced', 'warning', 'Deleted all saved work.');
        } catch (error) {
          if (isAbortError(error)) {
            addActivity('cloud-synced', 'warning', 'Saved work deletion was cancelled.');
            return;
          }

          addActivity('error', 'error', getErrorMessage(error, 'Could not delete saved work.'));
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
    (
      initialPrompt: string,
      referenceImages: BriefReferenceImage[] = [],
      signal?: AbortSignal,
    ): Promise<ProjectDraft> => client.generateProjectDraft(initialPrompt, referenceImages, signal),
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
      recipe: MarketingGenerationRecipe,
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
    runRevisions,
    historyBusy,
    historyError,
    activeDraftRunId,
    autosaveState,
    saveIdea,
    suggestedIdea,
    canUseOpenAIProxy,
    setSaveIdea,
    saveDraftNow,
    retryCloudSave: requestAutosaveRetry,
    refreshRunHistory,
    restoreRevision,
    startFreshDraft,
    ensureSavedRunsLoaded,
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
