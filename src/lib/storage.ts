import { APP_VERSION, STORAGE_KEY, createDefaultProject } from '../constants';
import { isRecord, normalizeProject } from './projectSchema';

import type { Project, ProjectJsonBackup } from '../types';

export const loadProject = (): Project => {
  const fallback = createDefaultProject();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.settings)) {
      return fallback;
    }

    return normalizeProject(parsed, fallback);
  } catch {
    return fallback;
  }
};

export const saveProject = (project: Project): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
};

export const createProjectBackup = (project: Project): ProjectJsonBackup => ({
  appVersion: APP_VERSION,
  exportedAt: new Date().toISOString(),
  project,
});

export const parseProjectBackup = (rawJson: string): Project => {
  const parsed: unknown = JSON.parse(rawJson);

  if (!isRecord(parsed) || !isRecord(parsed.project)) {
    throw new Error('Imported JSON does not contain a project backup.');
  }

  const fallback = createDefaultProject();

  return normalizeProject(parsed.project, fallback);
};
