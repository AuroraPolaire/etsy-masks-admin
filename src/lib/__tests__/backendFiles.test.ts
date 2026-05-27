import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_COLORING_PAGE_QUALITY,
  DEFAULT_MARKETING_SETTINGS,
  DEFAULT_OPENAI_IMAGE_SETTINGS,
} from '../../constants';
import { createManagedFileFromBackendRecord, managedFileToBackendMetadata } from '../backendFiles';

import type { BackendFileRecord, ManagedFile, Project } from '../../types';

const createProject = (): Project => ({
  id: 'project-1',
  settings: {
    title: 'Moon masks',
    theme: 'Moon',
    audience: 'Kids',
    marketplace: 'Etsy',
    style: 'Printable',
    description: 'Description',
    tags: 'moon',
    safetyNote: 'Safety',
    printingInstructions: 'Print',
    license: 'Personal use',
    refundPolicy: 'Digital product',
  },
  subjects: [{ id: 'subject-1', name: 'Moon' }],
  pdfSettings: {
    generateA4: true,
    generateUSLetter: true,
    maskScale: 'medium',
    showSubjectLabel: true,
    showInstructionFooter: true,
    pageMarginMm: 12,
    includeCalibrationPage: true,
  },
  openAIImageSettings: DEFAULT_OPENAI_IMAGE_SETTINGS,
  coloringPageQuality: DEFAULT_COLORING_PAGE_QUALITY,
  marketingSettings: DEFAULT_MARKETING_SETTINGS,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('backendFiles', () => {
  it('serializes managed file metadata for backend upload', () => {
    const project = createProject();
    const file = new File(['pdf'], 'moon.pdf', { type: 'application/pdf' });
    const managedFile: ManagedFile = {
      id: 'file-1',
      file,
      name: 'moon.pdf',
      originalName: 'source.pdf',
      size: file.size,
      type: file.type,
      addedAt: '2026-01-02T00:00:00.000Z',
      kind: 'generated-pdf',
      assetVariant: 'color',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      mappedSubjectId: 'subject-1',
      explicitlyConfirmed: true,
    };

    expect(managedFileToBackendMetadata(project, managedFile)).toEqual({
      id: 'file-1',
      projectId: 'project-1',
      name: 'moon.pdf',
      originalName: 'source.pdf',
      size: 3,
      type: 'application/pdf',
      kind: 'generated-pdf',
      assetVariant: 'color',
      addedAt: '2026-01-02T00:00:00.000Z',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      mappedSubjectId: 'subject-1',
      explicitlyConfirmed: true,
    });
  });

  it('round-trips marketing asset metadata', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:marketing'),
    });
    const project = createProject();
    const file = new File(['png'], 'moon-slogan-final.png', { type: 'image/png' });
    const marketingAsset: ManagedFile['marketingAsset'] = {
      type: 'slogan-poster',
      stage: 'final',
      optionIndex: 1,
      recipeId: 'slogan-2',
      sourceFileIds: ['moon-color'],
      generatedFromSettings: project.marketingSettings.preview.customSettings,
      generatedAt: '2026-05-26T10:00:00.000Z',
    };
    const managedFile: ManagedFile = {
      id: 'file-marketing',
      file,
      name: file.name,
      originalName: file.name,
      size: file.size,
      type: file.type,
      addedAt: '2026-05-26T10:00:00.000Z',
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      explicitlyConfirmed: true,
      marketingAsset,
    };

    const metadata = managedFileToBackendMetadata(project, managedFile);
    expect(metadata.marketingAsset).toEqual(marketingAsset);

    const restored = createManagedFileFromBackendRecord(
      {
        id: managedFile.id,
        runId: 'run-1',
        projectId: project.id,
        name: managedFile.name,
        originalName: managedFile.originalName,
        size: managedFile.size,
        type: managedFile.type,
        kind: managedFile.kind,
        addedAt: managedFile.addedAt,
        reviewState: managedFile.reviewState,
        reviewNotes: managedFile.reviewNotes,
        assetVariant: managedFile.assetVariant,
        explicitlyConfirmed: managedFile.explicitlyConfirmed,
        marketingAsset,
        updatedAt: '2026-05-26T10:01:00.000Z',
      },
      file,
    );

    expect(restored.marketingAsset).toEqual(marketingAsset);
    expect(restored.assetVariant).toBe('marketing-slogan');
  });

  it('recreates managed files from backend records and blobs', () => {
    const record: BackendFileRecord = {
      id: 'file-1',
      runId: 'run-1',
      projectId: 'project-1',
      name: 'moon.pdf',
      originalName: 'source.pdf',
      size: 3,
      type: 'application/pdf',
      kind: 'generated-pdf',
      addedAt: '2026-01-02T00:00:00.000Z',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      mappedSubjectId: 'subject-1',
      explicitlyConfirmed: true,
      updatedAt: '2026-01-03T00:00:00.000Z',
    };

    const managedFile = createManagedFileFromBackendRecord(
      record,
      new Blob(['pdf'], { type: 'application/pdf' }),
    );

    expect(managedFile).toMatchObject({
      id: 'file-1',
      name: 'moon.pdf',
      originalName: 'source.pdf',
      size: 3,
      type: 'application/pdf',
      kind: 'generated-pdf',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      mappedSubjectId: 'subject-1',
      assetVariant: 'color',
      explicitlyConfirmed: true,
    });
  });
});
