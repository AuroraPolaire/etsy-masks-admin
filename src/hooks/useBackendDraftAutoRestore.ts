import { useEffect, useRef } from 'react';

import { getProjectIdeaLabel } from '../lib/backendIdea';
import { downloadBackendRunFiles, getErrorMessage, isAbortError } from '../lib/backendSync';

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
  setActiveDraftRun: (runId: string, projectId?: string) => void;
  setSaveIdea: (idea: string) => void;
  setSelectedRunId: (runId: string) => void;
  setSnapshot: (snapshot: BackendProjectSnapshot | null) => void;
  markDraftRestored: (project: Project, files: ManagedFile[], idea: string, runId: string) => void;
  markDraftRestoreFailed: (message: string, runId: string) => void;
  clearAutosaveTracking: () => void;
  setRestoreStatus: (status: BackendDraftRestoreStatus) => void;
};

export const getInitialBackendDraftRestoreStatus = (
  initialDraftRunId: string,
): BackendDraftRestoreStatus => (initialDraftRunId ? 'restoring' : 'complete');

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

  useEffect(() => {
    if (
      !initialDraftRunId ||
      activeDraftRunId !== initialDraftRunId ||
      completedRunIdRef.current === initialDraftRunId
    ) {
      return;
    }

    setRestoreStatus('restoring');
    const controller = new AbortController();

    void (async () => {
      try {
        const nextSnapshot = await client.getRun(initialDraftRunId, controller.signal);

        if (!nextSnapshot.project) {
          setActiveDraftRun('', currentProjectId);
          clearAutosaveTracking();
          completedRunIdRef.current = initialDraftRunId;
          setRestoreStatus('complete');
          return;
        }

        const restoredFiles = await downloadBackendRunFiles(
          client,
          initialDraftRunId,
          nextSnapshot,
          {
            signal: controller.signal,
            setProgress: () => undefined,
          },
        );
        const restoredIdea = nextSnapshot.idea ?? getProjectIdeaLabel(nextSnapshot.project);

        setActiveDraftRun(initialDraftRunId, nextSnapshot.project.id);
        setSaveIdea(restoredIdea);
        setSelectedRunId(initialDraftRunId);
        setSnapshot(nextSnapshot);
        replaceProject(nextSnapshot.project);
        replaceFiles(restoredFiles);
        markDraftRestored(nextSnapshot.project, restoredFiles, restoredIdea, initialDraftRunId);
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
};
