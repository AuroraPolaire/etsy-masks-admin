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
  const retryAttemptRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const requestAutosaveRetry = useCallback(() => {
    clearRetryTimer();
    retryAttemptRef.current = 0;
    setRetryTick((currentTick) => currentTick + 1);
  }, [clearRetryTimer]);

  const markDraftSaved = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string, runId: string) => {
      const autosaveKey = createBackendAutosaveKey(nextProject, nextFiles, idea);
      lastAutosavedKeyRef.current = autosaveKey;
      clearRetryTimer();
      retryAttemptRef.current = 0;
      setAutosaveState({
        activeRunId: runId,
        status: 'saved',
        lastSavedAt: new Date().toISOString(),
      });
    },
    [clearRetryTimer],
  );

  const markDraftRestored = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string, runId: string) => {
      markDraftSaved(nextProject, nextFiles, idea, runId);
    },
    [markDraftSaved],
  );

  const markDraftRestoreFailed = useCallback(
    (message: string, runId: string) => {
      lastAutosavedKeyRef.current = '';
      clearRetryTimer();
      setAutosaveState((currentState) => ({
        ...currentState,
        activeRunId: runId.length > 0 ? runId : currentState.activeRunId,
        status: 'error',
        lastError: message,
      }));
    },
    [clearRetryTimer],
  );

  const clearAutosaveTracking = useCallback(() => {
    lastAutosavedKeyRef.current = '';
    clearRetryTimer();
    retryAttemptRef.current = 0;
    setAutosaveState({
      activeRunId: '',
      status: 'idle',
    });
  }, [clearRetryTimer]);

  const markCurrentStateDeleted = useCallback(
    (nextProject: Project, nextFiles: ManagedFile[], idea: string) => {
      lastAutosavedKeyRef.current = createBackendAutosaveKey(nextProject, nextFiles, idea);
      clearRetryTimer();
      retryAttemptRef.current = 0;
      setAutosaveState({
        activeRunId: '',
        status: 'idle',
      });
    },
    [clearRetryTimer],
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

    clearRetryTimer();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => {
        setAutosaveState((currentState) => {
          const nextState = { ...currentState };
          delete nextState.lastError;
          delete nextState.nextRetryAt;
          delete nextState.retryAttempt;
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
            clearRetryTimer();
            retryAttemptRef.current = 0;
          })
          .catch((error) => {
            if (isAbortError(error)) {
              return;
            }

            const retryAttempt = retryAttemptRef.current + 1;
            retryAttemptRef.current = retryAttempt;
            const retryDelayMs = Math.min(5000 * 2 ** (retryAttempt - 1), 60000);
            const nextRetryAt = new Date(Date.now() + retryDelayMs).toISOString();
            clearRetryTimer();
            retryTimeoutRef.current = window.setTimeout(() => {
              retryTimeoutRef.current = null;
              setRetryTick((currentTick) => currentTick + 1);
            }, retryDelayMs);

            setAutosaveState((currentState) => ({
              ...currentState,
              status: 'error',
              lastError: getErrorMessage(error, 'Online draft autosave failed.'),
              retryAttempt,
              nextRetryAt,
            }));
          });
      },
      retryTick > 0 ? 0 : 1800,
    );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeDraftRunId,
    clearRetryTimer,
    files,
    pauseAutosave,
    project,
    resolvedSaveIdea,
    retryTick,
    syncDraftRun,
  ]);

  useEffect(() => clearRetryTimer, [clearRetryTimer]);

  return {
    autosaveState,
    markDraftSaved,
    markDraftRestored,
    markDraftRestoreFailed,
    clearAutosaveTracking,
    markCurrentStateDeleted,
    requestAutosaveRetry,
  };
};
