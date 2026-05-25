import { APP_VERSION, STORAGE_KEY, createDefaultProject } from '../constants';

import type { Project, ProjectJsonBackup } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const LEGACY_MOCK_SUBJECT_SETS = [
  [
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
  ],
  [
    'Lion',
    'Tiger',
    'Elephant',
    'Giraffe',
    'Zebra',
    'Panda',
    'Fox',
    'Wolf',
    'Bear',
    'Rabbit',
    'Deer',
    'Owl',
  ],
];

const isLegacyMockSubjectList = (subjects: Project['subjects']): boolean =>
  LEGACY_MOCK_SUBJECT_SETS.some(
    (mockSubjects) =>
      subjects.length === mockSubjects.length &&
      subjects.every((subject, index) => subject.name === mockSubjects[index]),
  );

const removeLegacyMockSubjects = (subjects: Project['subjects']): Project['subjects'] =>
  isLegacyMockSubjectList(subjects) ? [] : subjects;

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

    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(isRecord(parsed.settings) ? parsed.settings : {}),
      },
      pdfSettings: readPdfSettings(parsed.pdfSettings, fallback.pdfSettings),
      subjects: removeLegacyMockSubjects(readSubjects(parsed)),
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
    subjects: removeLegacyMockSubjects(readSubjects(project)),
    updatedAt: new Date().toISOString(),
  };
};
