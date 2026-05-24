import type { ManagedFile } from '../types';

export const clearMappedSubject = (file: ManagedFile): ManagedFile => {
  const nextFile = { ...file };
  delete nextFile.mappedSubjectId;
  return nextFile;
};

export const withMappedSubject = (
  file: ManagedFile,
  subjectId: string | undefined,
): ManagedFile => {
  if (!subjectId) {
    return clearMappedSubject(file);
  }

  return {
    ...file,
    mappedSubjectId: subjectId,
  };
};

export const revokeObjectUrl = (file: ManagedFile): void => {
  if (file.objectUrl) {
    URL.revokeObjectURL(file.objectUrl);
  }
};

export const makeUniqueFile = (file: File, existingFiles: ManagedFile[]): File => {
  const existingNames = new Set(existingFiles.map((managedFile) => managedFile.name.toLowerCase()));
  if (!existingNames.has(file.name.toLowerCase())) {
    return file;
  }

  const extensionIndex = file.name.lastIndexOf('.');
  const extension = extensionIndex > 0 ? file.name.slice(extensionIndex + 1) : 'png';
  const baseName = extensionIndex > 0 ? file.name.slice(0, extensionIndex) : file.name;
  let counter = 2;
  let nextName = `${baseName}-${counter}.${extension}`;

  while (existingNames.has(nextName.toLowerCase())) {
    counter += 1;
    nextName = `${baseName}-${counter}.${extension}`;
  }

  return new File([file], nextName, { type: file.type || 'image/png' });
};
