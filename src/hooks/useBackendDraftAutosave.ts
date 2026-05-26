import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createBackendAutosaveKey,
  getErrorMessage,
  isAbortError,
  shouldAutosaveBackendDraft,
} from '../lib/backendSync';

import type { BackendAutosaveState, ManagedFile, Project } from '../types';

type SyncDraftRun = (signal: AbortSignal) => Promise<{ runId: string }>;

type UseBackendDraftAutosaveParams = {
  project: Project;
  files: ManagedFile[];
  resolvedSaveIdea: string;
  activeDraftRunId: string;
  pauseAutosave: boolean;
  isRestoringDraft: boolean;
  syncDraftRun: SyncDraftRun;
};

export const useBackendDraftAutosave = ({
  project,
  files,
  resolvedSaveIdea,
  activeDraftRunId,
  pauseAutosave,
  isRestoringDraft,
  syncDraftRun,
}: UseBackendDraftAutosaveParams) => {
  const [autosaveState, setAutosaveState] = useState<BackendAutosaveState>({
    activeRunId: activeDraftRunId,
    status: 'idle',
  });
  const lastAutosavedKeyRef = useRef('');

  const markDraftSaved = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string, runId: string) => {
      const autosaveKey = createBackendAutosaveKey(nextProject, nextFiles, idea);
      lastAutosavedKeyRef.current = autosaveKey;
      setAutosaveState({
        activeRunId: runId,
        status: 'saved',
        lastSavedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const markDraftRestored = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string, runId: string) => {
      markDraftSaved(nextProject, nextFiles, idea, runId);
    },
    [markDraftSaved],
  );

  const markDraftRestoreFailed = useCallback((message: string, runId: string) => {
    lastAutosavedKeyRef.current = '';
    setAutosaveState((currentState) => ({
      ...currentState,
      activeRunId: runId || currentState.activeRunId,
      status: 'error',
      lastError: message,
    }));
  }, []);

  const clearAutosaveTracking = useCallback(() => {
    lastAutosavedKeyRef.current = '';
    setAutosaveState({
      activeRunId: '',
      status: 'idle',
    });
  }, []);

  const markCurrentStateDeleted = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string) => {
      lastAutosavedKeyRef.current = createBackendAutosaveKey(nextProject, nextFiles, idea);
      setAutosaveState({
        activeRunId: '',
        status: 'idle',
      });
    },
    [],
  );

  useEffect(() => {
    setAutosaveState((currentState) => ({
      ...currentState,
      activeRunId: activeDraftRunId,
    }));
  }, [activeDraftRunId]);

  useEffect(() => {
    if (!isRestoringDraft) {
      return;
    }

    setAutosaveState((currentState) => {
      const nextState = { ...currentState };
      delete nextState.lastError;
      return {
        ...nextState,
        activeRunId: activeDraftRunId,
        status: 'restoring',
      };
    });
  }, [activeDraftRunId, isRestoringDraft]);

  useEffect(() => {
    if (pauseAutosave) {
      return;
    }

    if (!shouldAutosaveBackendDraft(project, files)) {
      setAutosaveState((currentState) => {
        const nextState = { ...currentState };
        delete nextState.lastError;
        return {
          ...nextState,
          status: 'idle',
        };
      });
      return;
    }

    const autosaveKey = createBackendAutosaveKey(project, files, resolvedSaveIdea);
    if (autosaveKey === lastAutosavedKeyRef.current) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setAutosaveState((currentState) => {
        const nextState = { ...currentState };
        delete nextState.lastError;
        return {
          ...nextState,
          activeRunId: activeDraftRunId,
          status: 'saving',
        };
      });

      void syncDraftRun(controller.signal)
        .then(({ runId }) => {
          lastAutosavedKeyRef.current = autosaveKey;
          setAutosaveState({
            activeRunId: runId,
            status: 'saved',
            lastSavedAt: new Date().toISOString(),
          });
        })
        .catch((error) => {
          if (isAbortError(error)) {
            return;
          }

          setAutosaveState((currentState) => ({
            ...currentState,
            status: 'error',
            lastError: getErrorMessage(error, 'Cloud draft autosave failed.'),
          }));
        });
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeDraftRunId, files, pauseAutosave, project, resolvedSaveIdea, syncDraftRun]);

  return {
    autosaveState,
    markDraftRestored,
    markDraftRestoreFailed,
    clearAutosaveTracking,
    markCurrentStateDeleted,
  };
};
