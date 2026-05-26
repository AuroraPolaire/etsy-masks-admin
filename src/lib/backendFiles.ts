import { isImageFile } from './files';

import type { BackendFileRecord, ManagedFile, Project } from '../types';

export type BackendManagedFileMetadata = {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  kind: ManagedFile['kind'];
  addedAt: string;
  reviewState: ManagedFile['reviewState'];
  reviewNotes: string;
  mappedSubjectId?: string;
  explicitlyConfirmed: boolean;
  imageMetadata?: ManagedFile['imageMetadata'];
};

export const managedFileToBackendMetadata = (
  project: Project,
  managedFile: ManagedFile,
): BackendManagedFileMetadata => ({
  id: managedFile.id,
  projectId: project.id,
  name: managedFile.name,
  originalName: managedFile.originalName,
  size: managedFile.size,
  type: managedFile.type,
  kind: managedFile.kind,
  addedAt: managedFile.addedAt,
  reviewState: managedFile.reviewState,
  reviewNotes: managedFile.reviewNotes,
  ...(managedFile.mappedSubjectId ? { mappedSubjectId: managedFile.mappedSubjectId } : {}),
  explicitlyConfirmed: managedFile.explicitlyConfirmed,
  ...(managedFile.imageMetadata ? { imageMetadata: managedFile.imageMetadata } : {}),
});

export const createManagedFileFromBackendRecord = (
  record: BackendFileRecord,
  blob: Blob,
): ManagedFile => {
  const file = new File([blob], record.name, {
    type: record.type || blob.type || 'application/octet-stream',
    lastModified: Date.parse(record.addedAt) || Date.now(),
  });
  const objectUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;

  return {
    id: record.id,
    file,
    name: record.name,
    originalName: record.originalName,
    size: file.size,
    type: file.type || record.type || 'application/octet-stream',
    addedAt: record.addedAt,
    kind: record.kind,
    ...(objectUrl ? { objectUrl } : {}),
    ...(record.imageMetadata ? { imageMetadata: record.imageMetadata } : {}),
    reviewState: record.reviewState,
    reviewNotes: record.reviewNotes,
    ...(record.mappedSubjectId ? { mappedSubjectId: record.mappedSubjectId } : {}),
    explicitlyConfirmed: record.explicitlyConfirmed,
  };
};
