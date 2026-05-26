import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_OPENAI_IMAGE_SETTINGS, STORAGE_KEY, createDefaultProject } from '../../constants';
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
    expect(createDefaultProject().settings.title).toBe('');
    expect(createDefaultProject().openAIImageSettings).toEqual(DEFAULT_OPENAI_IMAGE_SETTINGS);
    expect(loadProject().subjects).toEqual([]);
    expect(loadProject().settings.title).toBe('');
    expect(loadProject().openAIImageSettings).toEqual(DEFAULT_OPENAI_IMAGE_SETTINGS);
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

  it('preserves intentionally empty brief fields from browser state', () => {
    const project: Project = {
      ...createDefaultProject(),
      settings: {
        ...createDefaultProject().settings,
        description: '',
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    expect(loadProject().settings.description).toBe('');
  });

  it('preserves image generation settings from browser state', () => {
    const project: Project = {
      ...createDefaultProject(),
      openAIImageSettings: {
        model: 'gpt-image-1-mini',
        size: '1024x1536',
        quality: 'low',
        background: 'transparent',
        outputFormat: 'webp',
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    expect(loadProject().openAIImageSettings).toEqual(project.openAIImageSettings);
  });

  it('does not mark untouched default copy as brief progress', () => {
    const project = createDefaultProject();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    expect(loadProject().lastBriefUpdatedAt).toBeUndefined();
  });

  it('resets the legacy realistic animal mock project back to a blank brief', () => {
    const project: Project = {
      ...createProjectWithSubjects(['Lion', 'Tiger', 'Zebra']),
      settings: {
        ...createDefaultProject().settings,
        title:
          'Realistic Animal Masks Printable Bundle for Kids, 3 PNG Paper Masks, Safari Zoo Party, Classroom Craft, Digital Download',
        theme: 'Realistic Animal Masks',
        audience: 'Kids',
        style: 'Realistic printable mask for kids',
        description: 'Mock description for a digital download.',
        tags: 'animal masks, printable masks',
        safetyNote: 'Adult supervision required.',
        printingInstructions: 'Print and cut.',
        license: 'Personal use only.',
        refundPolicy: 'No refunds.',
      },
      lastBriefUpdatedAt: '2026-05-25T10:00:00.000Z',
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));

    const loadedProject = loadProject();

    expect(loadedProject.settings.title).toBe('');
    expect(loadedProject.subjects).toEqual([]);
    expect(loadedProject.lastBriefUpdatedAt).toBeUndefined();
  });

  it('strips unknown keys from imported project backups', () => {
    const backup = {
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: {
        ...createProjectWithSubjects(['Moon']),
        unexpected: 'value',
        settings: {
          ...createDefaultProject().settings,
          unknownSetting: 'value',
        },
      },
    };

    const project = parseProjectBackup(JSON.stringify(backup));

    expect(project.subjects.map((subject) => subject.name)).toEqual(['Moon']);
    expect(Object.prototype.hasOwnProperty.call(project, 'unexpected')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(project.settings, 'unknownSetting')).toBe(false);
  });

  it('normalizes invalid PDF settings from imported project backups', () => {
    const backup = {
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: {
        ...createDefaultProject(),
        pdfSettings: {
          generateA4: 'yes',
          generateUSLetter: false,
          maskScale: 'huge',
          showAnimalLabel: false,
          showInstructionFooter: 'no',
          pageMarginMm: 100,
          includeCalibrationPage: true,
        },
      },
    };

    const project = parseProjectBackup(JSON.stringify(backup));

    expect(project.pdfSettings).toEqual({
      generateA4: true,
      generateUSLetter: false,
      maskScale: 'medium',
      showSubjectLabel: false,
      showInstructionFooter: true,
      pageMarginMm: 30,
      includeCalibrationPage: true,
    });
  });

  it('normalizes invalid image generation settings from imported project backups', () => {
    const backup = {
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: {
        ...createDefaultProject(),
        openAIImageSettings: {
          model: 'expensive-image-model',
          size: '4096x4096',
          quality: 'ultra',
          background: 'neon',
          outputFormat: 'tiff',
        },
      },
    };

    const project = parseProjectBackup(JSON.stringify(backup));

    expect(project.openAIImageSettings).toEqual(DEFAULT_OPENAI_IMAGE_SETTINGS);
  });
});
