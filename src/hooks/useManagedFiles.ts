import { useCallback, useEffect, useRef, useState } from 'react';

import { clearMappedSubject, revokeObjectUrl, withMappedSubject } from '../lib/fileLifecycle';

import type { AddActivity, ManagedFile, SubjectItem } from '../types';

type UseManagedFilesParams = {
  subjects: SubjectItem[];
  addActivity: AddActivity;
};

export const useManagedFiles = ({ subjects, addActivity }: UseManagedFilesParams) => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const filesRef = useRef<ManagedFile[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => filesRef.current.forEach(revokeObjectUrl), []);

  const appendFiles = useCallback((managedFiles: ManagedFile[]) => {
    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles, ...managedFiles];
      filesRef.current = nextFiles;
      return nextFiles;
    });
  }, []);

  const updateFile = useCallback((fileId: string, updater: (file: ManagedFile) => ManagedFile) => {
    setFiles((currentFiles) => {
      const nextFiles = currentFiles.map((file) => (file.id === fileId ? updater(file) : file));
      filesRef.current = nextFiles;
      return nextFiles;
    });
  }, []);

  const deleteFile = useCallback(
    (fileId: string) => {
      const file = filesRef.current.find((item) => item.id === fileId);
      if (file) {
        revokeObjectUrl(file);
      }

      setFiles((currentFiles) => {
        const nextFiles = currentFiles.filter((item) => item.id !== fileId);
        filesRef.current = nextFiles;
        return nextFiles;
      });
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

  const clearAllMappings = useCallback(() => {
    setFiles((currentFiles) => {
      const nextFiles = currentFiles.map(clearMappedSubject);
      filesRef.current = nextFiles;
      return nextFiles;
    });
  }, []);

  const clearSubjectMapping = useCallback((subjectId: string) => {
    setFiles((currentFiles) => {
      const nextFiles = currentFiles.map((file) =>
        file.mappedSubjectId === subjectId ? clearMappedSubject(file) : file,
      );
      filesRef.current = nextFiles;
      return nextFiles;
    });
  }, []);

  const clearFiles = useCallback(
    (activityMessage?: string) => {
      filesRef.current.forEach(revokeObjectUrl);
      filesRef.current = [];
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
      filesRef.current = managedFiles;
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
    deleteFile,
    mapFile,
    clearAllMappings,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
  };
};
