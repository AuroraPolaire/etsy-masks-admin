import { APP_VERSION, STORAGE_KEY, createDefaultProject } from '../constants';

import type { Project, ProjectJsonBackup } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const loadProject = (): Project => {
  const fallback = createDefaultProject();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.settings) || !Array.isArray(parsed.animals)) {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(isRecord(parsed.settings) ? parsed.settings : {}),
      },
      pdfSettings: {
        ...fallback.pdfSettings,
        ...(isRecord(parsed.pdfSettings) ? parsed.pdfSettings : {}),
      },
      animals: parsed.animals
        .filter(isRecord)
        .map((animal) => ({
          id: typeof animal.id === 'string' ? animal.id : crypto.randomUUID(),
          name: typeof animal.name === 'string' ? animal.name : 'Untitled',
        }))
        .filter((animal) => animal.name.trim().length > 0),
      updatedAt: new Date().toISOString(),
    };
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

  const backup = parsed as ProjectJsonBackup;
  const fallback = createDefaultProject();

  return {
    ...fallback,
    ...backup.project,
    settings: {
      ...fallback.settings,
      ...backup.project.settings,
    },
    pdfSettings: {
      ...fallback.pdfSettings,
      ...backup.project.pdfSettings,
    },
    animals: backup.project.animals.map((animal) => ({
      id: animal.id || crypto.randomUUID(),
      name: animal.name,
    })),
    updatedAt: new Date().toISOString(),
  };
};
