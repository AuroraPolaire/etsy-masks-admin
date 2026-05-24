import { useCallback, useEffect, useState } from 'react';

import { nowIso } from '../lib/dates';
import { loadProject, saveProject } from '../lib/storage';

import type { PdfSettings, Project, ProjectSettings, SubjectItem } from '../types';

type InitialProjectDraft = {
  settings: ProjectSettings;
  subjects: SubjectItem[];
};

export const useProjectState = () => {
  const [project, setProject] = useState<Project>(() => loadProject());

  const updateProject = useCallback((updater: (project: Project) => Project) => {
    setProject((currentProject) => {
      const updated = updater(currentProject);
      return {
        ...updated,
        updatedAt: nowIso(),
      };
    });
  }, []);

  const replaceProject = useCallback((nextProject: Project) => {
    setProject(nextProject);
  }, []);

  const updateSettings = useCallback(
    (settings: ProjectSettings) => {
      updateProject((currentProject) => ({ ...currentProject, settings }));
    },
    [updateProject],
  );

  const updatePdfSettings = useCallback(
    (pdfSettings: PdfSettings) => {
      updateProject((currentProject) => ({ ...currentProject, pdfSettings }));
    },
    [updateProject],
  );

  const applyInitialDraft = useCallback(
    (draft: InitialProjectDraft) => {
      updateProject((currentProject) => ({
        ...currentProject,
        settings: draft.settings,
        subjects: draft.subjects,
      }));
    },
    [updateProject],
  );

  const addSubject = useCallback(
    (name: string) => {
      updateProject((currentProject) => ({
        ...currentProject,
        subjects: [...currentProject.subjects, { id: crypto.randomUUID(), name }],
      }));
    },
    [updateProject],
  );

  const removeSubject = useCallback(
    (subjectId: string) => {
      updateProject((currentProject) => ({
        ...currentProject,
        subjects: currentProject.subjects.filter((subject) => subject.id !== subjectId),
      }));
    },
    [updateProject],
  );

  const markImageApproved = useCallback(() => {
    updateProject((currentProject) => ({
      ...currentProject,
      lastImageApprovalAt: nowIso(),
    }));
  }, [updateProject]);

  useEffect(() => {
    saveProject(project);
  }, [project]);

  return {
    project,
    updateProject,
    replaceProject,
    updateSettings,
    updatePdfSettings,
    applyInitialDraft,
    addSubject,
    removeSubject,
    markImageApproved,
  };
};
