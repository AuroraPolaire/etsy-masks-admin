import { useEffect, useRef } from 'react';

import { getProjectIdeaLabel } from '../lib/backendIdea';
import {
  getBackendRestoreNowMs,
  logBackendRestoreInstrumentation,
} from '../lib/backendRestoreInstrumentation';
import {
  downloadBackendRunFiles,
  findReusableBackendDraftRun,
  getErrorMessage,
  isAbortError,
} from '../lib/backendSync';

import type { createBackendClient } from '../lib/backendClient';
import type { AddActivity, BackendProjectSnapshot, ManagedFile, Project } from '../types';

type BackendClient = ReturnType<typeof createBackendClient>;

export type BackendDraftRestoreStatus = 'complete' | 'restoring' | 'failed';

type UseBackendDraftAutoRestoreParams = {
  client: BackendClient;
  initialDraftRunId: string;
  activeDraftRunId: string;
  currentProjectId: string;
  addActivity: AddActivity;
  replaceProject: (project: Project) => void;
  replaceFiles: (files: ManagedFile[], activityMessage?: string) => void;
  appendFiles: (files: ManagedFile[]) => void;
  setActiveDraftRun: (runId: string, projectId?: string) => void;
  setSaveIdea: (idea: string) => void;
  setSelectedRunId: (runId: string) => void;
  setSnapshot: (snapshot: BackendProjectSnapshot | null) => void;
  markDraftRestored: (project: Project, files: ManagedFile[], idea: string, runId: string) => void;
  markDraftRestoreFailed: (message: string, runId: string) => void;
  clearAutosaveTracking: () => void;
  setRestoreStatus: (status: BackendDraftRestoreStatus) => void;
};

export const getInitialBackendDraftRestoreStatus = (): BackendDraftRestoreStatus => 'restoring';

export const shouldPauseBackendDraftAutosave = (status: BackendDraftRestoreStatus): boolean =>
  status === 'restoring' || status === 'failed';

export const useBackendDraftAutoRestore = ({
  client,
  initialDraftRunId,
  activeDraftRunId,
  currentProjectId,
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
  setRestoreStatus,
}: UseBackendDraftAutoRestoreParams) => {
  const completedRunIdRef = useRef('');
  const completedDiscoveryProjectIdRef = useRef('');
  const activeDraftRunIdRef = useRef(activeDraftRunId);

  useEffect(() => {
    activeDraftRunIdRef.current = activeDraftRunId;
  }, [activeDraftRunId]);

  useEffect(() => {
    if (!initialDraftRunId) {
      return;
    }

    if (activeDraftRunId !== initialDraftRunId || completedRunIdRef.current === initialDraftRunId) {
      return;
    }

    setRestoreStatus('restoring');
    const controller = new AbortController();

    void (async () => {
      try {
        const restoreStartedAt = getBackendRestoreNowMs();
        const metadataStartedAt = getBackendRestoreNowMs();
        const nextSnapshot = await client.getRun(initialDraftRunId, controller.signal);
        const metadataFetchMs = getBackendRestoreNowMs() - metadataStartedAt;
        let firstFileAppendedMs: number | null = null;

        if (!nextSnapshot.project) {
          setActiveDraftRun('', currentProjectId);
          clearAutosaveTracking();
          completedRunIdRef.current = initialDraftRunId;
          setRestoreStatus('complete');
          return;
        }

        const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);

        setActiveDraftRun(initialDraftRunId, nextSnapshot.project.id);
        setSaveIdea(restoredIdea);
        setSelectedRunId(initialDraftRunId);
        setSnapshot(nextSnapshot);
        replaceProject(nextSnapshot.project);
        replaceFiles([]);

        const result = await downloadBackendRunFiles(client, initialDraftRunId, nextSnapshot, {
          signal: controller.signal,
          setProgress: () => undefined,
          onFileRestored: (file) => {
            firstFileAppendedMs ??= getBackendRestoreNowMs() - restoreStartedAt;
            appendFiles([file]);
          },
        });
        logBackendRestoreInstrumentation({
          label: 'active-draft',
          metadataFetchMs,
          firstFileAppendedMs,
          totalRestoreMs: getBackendRestoreNowMs() - restoreStartedAt,
          result,
        });
        if (controller.signal.aborted) {
          return;
        }

        if (result.cancelled || result.failedFiles.length > 0) {
          const message = result.cancelled
            ? 'Backend draft restore was cancelled. Autosave is paused to protect cloud files.'
            : `Restored ${result.files.length}/${nextSnapshot.files.length} file(s); ${result.failedFiles.length} failed. Autosave is paused to protect cloud files.`;
          markDraftRestoreFailed(message, initialDraftRunId);
          setRestoreStatus('failed');
          addActivity(
            result.cancelled ? 'cloud-synced' : 'error',
            result.cancelled ? 'warning' : 'error',
            message,
          );
          return;
        }

        markDraftRestored(nextSnapshot.project, result.files, restoredIdea, initialDraftRunId);
        completedRunIdRef.current = initialDraftRunId;
        setRestoreStatus('complete');
        addActivity('cloud-synced', 'success', `Restored active backend draft "${restoredIdea}".`);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        const message = getErrorMessage(
          error,
          'Could not restore the active backend draft. Autosave is paused to protect cloud files.',
        );
        markDraftRestoreFailed(message, initialDraftRunId);
        setRestoreStatus('failed');
        addActivity('error', 'error', message);
      }
    })();

    return () => controller.abort();
  }, [
    activeDraftRunId,
    addActivity,
    appendFiles,
    clearAutosaveTracking,
    client,
    currentProjectId,
    initialDraftRunId,
    markDraftRestored,
    markDraftRestoreFailed,
    replaceFiles,
    replaceProject,
    setActiveDraftRun,
    setRestoreStatus,
    setSaveIdea,
    setSelectedRunId,
    setSnapshot,
  ]);

  useEffect(() => {
    if (initialDraftRunId) {
      return;
    }

    if (completedDiscoveryProjectIdRef.current === currentProjectId) {
      return;
    }

    if (activeDraftRunIdRef.current) {
      completedDiscoveryProjectIdRef.current = currentProjectId;
      setRestoreStatus('complete');
      return;
    }

    setRestoreStatus('restoring');
    const controller = new AbortController();

    void (async () => {
      try {
        const { runs } = await client.listRuns(controller.signal);
        const reusableRun = findReusableBackendDraftRun(runs, currentProjectId);

        if (!reusableRun) {
          completedDiscoveryProjectIdRef.current = currentProjectId;
          setRestoreStatus('complete');
          return;
        }

        const restoreStartedAt = getBackendRestoreNowMs();
        const metadataStartedAt = getBackendRestoreNowMs();
        const nextSnapshot = await client.getRun(reusableRun.id, controller.signal);
        const metadataFetchMs = getBackendRestoreNowMs() - metadataStartedAt;
        let firstFileAppendedMs: number | null = null;

        if (!nextSnapshot.project) {
          completedDiscoveryProjectIdRef.current = currentProjectId;
          setRestoreStatus('complete');
          return;
        }

        const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);

        completedDiscoveryProjectIdRef.current = currentProjectId;
        setActiveDraftRun(reusableRun.id, nextSnapshot.project.id);
        setSaveIdea(restoredIdea);
        setSelectedRunId(reusableRun.id);
        setSnapshot(nextSnapshot);
        replaceProject(nextSnapshot.project);
        replaceFiles([]);

        const result = await downloadBackendRunFiles(client, reusableRun.id, nextSnapshot, {
          signal: controller.signal,
          setProgress: () => undefined,
          onFileRestored: (file) => {
            firstFileAppendedMs ??= getBackendRestoreNowMs() - restoreStartedAt;
            appendFiles([file]);
          },
        });
        logBackendRestoreInstrumentation({
          label: 'discovered-draft',
          metadataFetchMs,
          firstFileAppendedMs,
          totalRestoreMs: getBackendRestoreNowMs() - restoreStartedAt,
          result,
        });
        if (controller.signal.aborted) {
          return;
        }

        if (result.cancelled || result.failedFiles.length > 0) {
          const message = result.cancelled
            ? 'Backend draft restore was cancelled. Autosave is paused to protect cloud files.'
            : `Restored ${result.files.length}/${nextSnapshot.files.length} file(s); ${result.failedFiles.length} failed. Autosave is paused to protect cloud files.`;
          markDraftRestoreFailed(message, reusableRun.id);
          setRestoreStatus('failed');
          addActivity(
            result.cancelled ? 'cloud-synced' : 'error',
            result.cancelled ? 'warning' : 'error',
            message,
          );
          return;
        }

        markDraftRestored(nextSnapshot.project, result.files, restoredIdea, reusableRun.id);
        setRestoreStatus('complete');
        addActivity('cloud-synced', 'success', `Restored backend draft "${restoredIdea}".`);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        completedDiscoveryProjectIdRef.current = currentProjectId;
        setRestoreStatus('complete');
      }
    })();

    return () => controller.abort();
  }, [
    addActivity,
    appendFiles,
    client,
    currentProjectId,
    initialDraftRunId,
    markDraftRestored,
    markDraftRestoreFailed,
    replaceFiles,
    replaceProject,
    setActiveDraftRun,
    setRestoreStatus,
    setSaveIdea,
    setSelectedRunId,
    setSnapshot,
  ]);
};
