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
  syncDraftRun: SyncDraftRun;
};

export const useBackendDraftAutosave = ({
  project,
  files,
  resolvedSaveIdea,
  activeDraftRunId,
  syncDraftRun,
}: UseBackendDraftAutosaveParams) => {
  const [autosaveState, setAutosaveState] = useState<BackendAutosaveState>({
    activeRunId: activeDraftRunId,
    status: 'idle',
  });
  const lastAutosavedKeyRef = useRef('');
  const lastFinalizedKeyRef = useRef('');

  const markDraftSaved = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string, runId: string) => {
      const autosaveKey = createBackendAutosaveKey(nextProject, nextFiles, idea);
      lastAutosavedKeyRef.current = autosaveKey;
      lastFinalizedKeyRef.current = '';
      setAutosaveState({
        activeRunId: runId,
        status: 'saved',
        lastSavedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const markFinalSaved = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string) => {
      const finalizedKey = createBackendAutosaveKey(nextProject, nextFiles, idea);
      lastFinalizedKeyRef.current = finalizedKey;
      lastAutosavedKeyRef.current = finalizedKey;
      setAutosaveState({
        activeRunId: '',
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

  const markFinalRestored = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string) => {
      lastFinalizedKeyRef.current = createBackendAutosaveKey(nextProject, nextFiles, idea);
      lastAutosavedKeyRef.current = '';
      setAutosaveState((currentState) => ({
        ...currentState,
        activeRunId: '',
        status: 'saved',
      }));
    },
    [],
  );

  const clearAutosaveTracking = useCallback(() => {
    lastAutosavedKeyRef.current = '';
    lastFinalizedKeyRef.current = '';
    setAutosaveState({
      activeRunId: '',
      status: 'idle',
    });
  }, []);

  useEffect(() => {
    setAutosaveState((currentState) => ({
      ...currentState,
      activeRunId: activeDraftRunId,
    }));
  }, [activeDraftRunId]);

  useEffect(() => {
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
    if (
      autosaveKey === lastAutosavedKeyRef.current ||
      autosaveKey === lastFinalizedKeyRef.current
    ) {
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
          lastFinalizedKeyRef.current = '';
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
            lastError: getErrorMessage(error, 'Backend draft autosave failed.'),
          }));
        });
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeDraftRunId, files, project, resolvedSaveIdea, syncDraftRun]);

  return {
    autosaveState,
    markDraftSaved,
    markFinalSaved,
    markDraftRestored,
    markFinalRestored,
    clearAutosaveTracking,
  };
};
