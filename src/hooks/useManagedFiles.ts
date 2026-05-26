import { useCallback, useEffect, useRef, useState } from 'react';

import { clearMappedSubject, revokeObjectUrl, withMappedSubject } from '../lib/fileLifecycle';
import { createManagedFile, dedupeIncomingFiles, replaceGeneratedFiles } from '../lib/files';

import type { AddActivity, ManagedFile, SubjectItem } from '../types';

type UseManagedFilesParams = {
  subjects: SubjectItem[];
  addActivity: AddActivity;
  onImageApproved: () => void;
};

export const useManagedFiles = ({
  subjects,
  addActivity,
  onImageApproved,
}: UseManagedFilesParams) => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const filesRef = useRef<ManagedFile[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => filesRef.current.forEach(revokeObjectUrl), []);

  const appendFiles = useCallback((managedFiles: ManagedFile[]) => {
    setFiles((currentFiles) => [...currentFiles, ...managedFiles]);
  }, []);

  const uploadFiles = useCallback(
    async (incomingFiles: File[]) => {
      try {
        const { accepted, duplicates, unsupported } = dedupeIncomingFiles(files, incomingFiles);
        duplicates.forEach((name) =>
          addActivity('file-added', 'warning', `Skipped duplicate file: ${name}.`),
        );
        unsupported.forEach((name) =>
          addActivity('file-added', 'warning', `Skipped unsupported file: ${name}.`),
        );

        const managedFiles: ManagedFile[] = [];
        for (const file of accepted) {
          try {
            managedFiles.push(await createManagedFile(file, subjects));
          } catch (error) {
            addActivity(
              'error',
              'error',
              error instanceof Error ? error.message : `Could not read ${file.name}.`,
            );
          }
        }

        if (managedFiles.length > 0) {
          appendFiles(managedFiles);
          addActivity('file-added', 'success', `Added ${managedFiles.length} file(s).`);
        }
      } catch (error) {
        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'File upload failed.',
        );
      }
    },
    [addActivity, appendFiles, files, subjects],
  );

  const updateFile = useCallback((fileId: string, updater: (file: ManagedFile) => ManagedFile) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) => (file.id === fileId ? updater(file) : file)),
    );
  }, []);

  const approveFile = useCallback(
    (fileId: string) => {
      updateFile(fileId, (file) => ({
        ...file,
        reviewState: 'approved',
        explicitlyConfirmed: true,
      }));
      onImageApproved();
      addActivity('image-approved', 'success', 'Image approved.');
    },
    [addActivity, onImageApproved, updateFile],
  );

  const rejectFile = useCallback(
    (fileId: string) => {
      updateFile(fileId, (file) => ({
        ...file,
        reviewState: 'rejected',
      }));
      addActivity('image-rejected', 'warning', 'Image rejected.');
    },
    [addActivity, updateFile],
  );

  const deleteFile = useCallback(
    (fileId: string) => {
      const file = filesRef.current.find((item) => item.id === fileId);
      if (file) {
        revokeObjectUrl(file);
      }

      setFiles((currentFiles) => currentFiles.filter((item) => item.id !== fileId));
      addActivity('file-removed', 'warning', `Removed ${file?.name ?? 'file'}.`);
    },
    [addActivity],
  );

  const mapFile = useCallback(
    (fileId: string, subjectId: string | undefined) => {
      updateFile(fileId, (file) => withMappedSubject(file, subjectId));
      const subjectName =
        subjects.find((subject) => subject.id === subjectId)?.name ?? 'unassigned';
      addActivity('image-mapped', 'info', `Assigned image to ${subjectName}.`);
    },
    [addActivity, subjects, updateFile],
  );

  const updateNotes = useCallback(
    (fileId: string, notes: string) => {
      updateFile(fileId, (file) => ({
        ...file,
        reviewNotes: notes,
      }));
    },
    [updateFile],
  );

  const confirmReview = useCallback(
    (fileId: string) => {
      updateFile(fileId, (file) => ({
        ...file,
        explicitlyConfirmed: true,
      }));
      addActivity('notes-updated', 'success', 'Image marked reviewed.');
    },
    [addActivity, updateFile],
  );

  const clearAllMappings = useCallback(() => {
    setFiles((currentFiles) => currentFiles.map(clearMappedSubject));
  }, []);

  const clearSubjectMapping = useCallback((subjectId: string) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.mappedSubjectId === subjectId ? clearMappedSubject(file) : file,
      ),
    );
  }, []);

  const clearFiles = useCallback(
    (activityMessage?: string) => {
      filesRef.current.forEach(revokeObjectUrl);
      setFiles([]);

      if (activityMessage) {
        addActivity('file-removed', 'warning', activityMessage);
      }
    },
    [addActivity],
  );

  const replaceFiles = useCallback(
    (managedFiles: ManagedFile[], activityMessage?: string) => {
      filesRef.current.forEach(revokeObjectUrl);
      setFiles(managedFiles);

      if (activityMessage) {
        addActivity('file-added', 'success', activityMessage);
      }
    },
    [addActivity],
  );

  const replaceGeneratedFilesByKind = useCallback(
    (
      generatedFiles: ManagedFile[],
      kind: Extract<ManagedFile['kind'], 'generated-pdf' | 'generated-preview'>,
    ) => {
      setFiles((currentFiles) => {
        currentFiles.filter((file) => file.kind === kind).forEach(revokeObjectUrl);
        return replaceGeneratedFiles(currentFiles, generatedFiles, kind);
      });
    },
    [],
  );

  return {
    files,
    filesRef,
    appendFiles,
    uploadFiles,
    approveFile,
    rejectFile,
    deleteFile,
    mapFile,
    updateNotes,
    confirmReview,
    clearAllMappings,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
    replaceGeneratedFilesByKind,
  };
};
