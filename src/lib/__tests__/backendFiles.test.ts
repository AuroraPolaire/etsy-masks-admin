import { describe, expect, it } from 'vitest';

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
      addedAt: '2026-01-02T00:00:00.000Z',
      reviewState: 'approved',
      reviewNotes: 'Ready',
      mappedSubjectId: 'subject-1',
      explicitlyConfirmed: true,
    });
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
      explicitlyConfirmed: true,
    });
  });
});
