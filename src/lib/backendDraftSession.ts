const ACTIVE_BACKEND_DRAFT_KEY = 'etsy-masks-admin/active-backend-draft-run-id';

export const loadActiveBackendDraftRunId = (): string => {
  try {
    return window.localStorage.getItem(ACTIVE_BACKEND_DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveActiveBackendDraftRunId = (runId: string): void => {
  try {
    if (runId) {
      window.localStorage.setItem(ACTIVE_BACKEND_DRAFT_KEY, runId);
      return;
    }

    window.localStorage.removeItem(ACTIVE_BACKEND_DRAFT_KEY);
  } catch {
    // Backend autosave still works for the current session if localStorage is unavailable.
  }
};
