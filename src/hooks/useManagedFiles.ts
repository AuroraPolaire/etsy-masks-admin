import { useCallback, useEffect, useRef, useState } from 'react';

import { clearMappedSubject, revokeObjectUrl, withMappedSubject } from '../lib/fileLifecycle';

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

  const approveFiles = useCallback(
    (fileIds: string[]) => {
      const targetIds = new Set(fileIds);
      const targetCount = filesRef.current.filter((file) => targetIds.has(file.id)).length;
      if (targetCount === 0) {
        return;
      }

      setFiles((currentFiles) =>
        currentFiles.map((file) =>
          targetIds.has(file.id)
            ? {
                ...file,
                reviewState: 'approved',
                explicitlyConfirmed: true,
              }
            : file,
        ),
      );
      onImageApproved();
      addActivity(
        'image-approved',
        'success',
        `Approved ${targetCount} image${targetCount === 1 ? '' : 's'}.`,
      );
    },
    [addActivity, onImageApproved],
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

  return {
    files,
    filesRef,
    appendFiles,
    approveFile,
    approveFiles,
    rejectFile,
    deleteFile,
    mapFile,
    updateNotes,
    confirmReview,
    clearAllMappings,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
  };
};
