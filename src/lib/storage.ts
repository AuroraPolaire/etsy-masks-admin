import { APP_VERSION, STORAGE_KEY, createDefaultProject } from '../constants';

import type { Project, ProjectJsonBackup } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const LEGACY_MOCK_SUBJECTS = [
  'Robot',
  'Dinosaur',
  'Unicorn',
  'Dragon',
  'Astronaut',
  'Pirate',
  'Butterfly',
  'Flower',
  'Sun',
  'Moon',
  'Lion',
  'Owl',
];

const isLegacyMockSubjectList = (subjects: Project['subjects']): boolean =>
  subjects.length === LEGACY_MOCK_SUBJECTS.length &&
  subjects.every((subject, index) => subject.name === LEGACY_MOCK_SUBJECTS[index]);

const readSubjects = (projectLike: Record<string, unknown>): Project['subjects'] => {
  const rawSubjects = Array.isArray(projectLike.subjects)
    ? projectLike.subjects
    : Array.isArray(projectLike.animals)
      ? projectLike.animals
      : [];

  return rawSubjects
    .filter(isRecord)
    .map((subject) => ({
      id: typeof subject.id === 'string' ? subject.id : crypto.randomUUID(),
      name: typeof subject.name === 'string' ? subject.name : 'Untitled',
    }))
    .filter((subject) => subject.name.trim().length > 0);
};

const readPdfSettings = (
  pdfSettingsLike: unknown,
  fallback: Project['pdfSettings'],
): Project['pdfSettings'] => {
  if (!isRecord(pdfSettingsLike)) {
    return fallback;
  }

  return {
    ...fallback,
    ...pdfSettingsLike,
    showSubjectLabel:
      typeof pdfSettingsLike.showSubjectLabel === 'boolean'
        ? pdfSettingsLike.showSubjectLabel
        : typeof pdfSettingsLike.showAnimalLabel === 'boolean'
          ? pdfSettingsLike.showAnimalLabel
          : fallback.showSubjectLabel,
  };
};

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

    const subjects = readSubjects(parsed);
    const restoredSubjects = isLegacyMockSubjectList(subjects) ? [] : subjects;

    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(isRecord(parsed.settings) ? parsed.settings : {}),
      },
      pdfSettings: readPdfSettings(parsed.pdfSettings, fallback.pdfSettings),
      subjects: restoredSubjects,
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

  const backup = parsed as { appVersion?: string; project: Record<string, unknown> };
  const fallback = createDefaultProject();
  const project = backup.project;
  const settings = isRecord(project.settings) ? project.settings : {};

  return {
    ...fallback,
    ...project,
    settings: {
      ...fallback.settings,
      ...settings,
    },
    pdfSettings: readPdfSettings(project.pdfSettings, fallback.pdfSettings),
    subjects: readSubjects(project),
    updatedAt: new Date().toISOString(),
  };
};
