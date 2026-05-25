import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY, createDefaultProject } from '../../constants';
import { loadProject, parseProjectBackup } from '../storage';

import type { Project, ProjectJsonBackup } from '../../types';

const originalAnimalSubjects = [
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
];

const genericMockSubjects = [
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

const createProjectWithSubjects = (subjectNames: string[]): Project => ({
  ...createDefaultProject(),
  subjects: subjectNames.map((name) => ({
    id: crypto.randomUUID(),
    name,
  })),
});

describe('project storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts new projects without mocked topics', () => {
    expect(createDefaultProject().subjects).toEqual([]);
    expect(loadProject().subjects).toEqual([]);
    expect(loadProject().lastBriefUpdatedAt).toBeUndefined();
  });

  it('clears original animal mock topics from saved browser state', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(createProjectWithSubjects(originalAnimalSubjects)),
    );

    expect(loadProject().subjects).toEqual([]);
  });

  it('clears generic mock topics from imported project backups', () => {
    const backup: ProjectJsonBackup = {
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: createProjectWithSubjects(genericMockSubjects),
    };

    expect(parseProjectBackup(JSON.stringify(backup)).subjects).toEqual([]);
  });

  it('preserves user-entered topics', () => {
    const project = createProjectWithSubjects(['Fox', 'Moon', 'Custom Crown']);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    const loadedProject = loadProject();

    expect(loadedProject.subjects.map((subject) => subject.name)).toEqual([
      'Fox',
      'Moon',
      'Custom Crown',
    ]);
    expect(loadedProject.lastBriefUpdatedAt).toBe(project.updatedAt);
  });

  it('does not mark untouched default copy as brief progress', () => {
    const project = createDefaultProject();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    expect(loadProject().lastBriefUpdatedAt).toBeUndefined();
  });
});
