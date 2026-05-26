const LEGACY_ACTIVE_BACKEND_DRAFT_KEY = 'etsy-masks-admin/active-backend-draft-run-id';
const ACTIVE_BACKEND_DRAFT_BY_PROJECT_KEY =
  'etsy-masks-admin/active-backend-draft-run-id-by-project-v1';

const readDraftMap = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ACTIVE_BACKEND_DRAFT_BY_PROJECT_KEY) ?? '{}',
    ) as unknown;

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
};

export const loadActiveBackendDraftRunId = (projectId: string): string => {
  try {
    const mappedRunId = readDraftMap()[projectId];
    if (mappedRunId) {
      return mappedRunId;
    }

    return window.localStorage.getItem(LEGACY_ACTIVE_BACKEND_DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveActiveBackendDraftRunId = (projectId: string, runId: string): void => {
  try {
    const draftMap = readDraftMap();
    if (runId) {
      draftMap[projectId] = runId;
    } else {
      delete draftMap[projectId];
    }

    window.localStorage.setItem(ACTIVE_BACKEND_DRAFT_BY_PROJECT_KEY, JSON.stringify(draftMap));
    window.localStorage.removeItem(LEGACY_ACTIVE_BACKEND_DRAFT_KEY);
  } catch {
    // Backend autosave still works for the current session if localStorage is unavailable.
  }
};
