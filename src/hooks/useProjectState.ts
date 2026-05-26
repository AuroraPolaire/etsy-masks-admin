import { useCallback, useEffect, useState } from 'react';

import { nowIso } from '../lib/dates';
import { loadProject, saveProject } from '../lib/storage';

import type {
  OpenAIImageSettings,
  PdfSettings,
  EtsySeoAnalysis,
  Project,
  ProjectSettings,
  SubjectItem,
} from '../types';

type InitialProjectDraft = {
  settings: ProjectSettings;
  subjects: SubjectItem[];
  etsySeoAnalysis?: EtsySeoAnalysis;
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
      updateProject((currentProject) => ({
        ...currentProject,
        settings,
        lastBriefUpdatedAt: nowIso(),
      }));
    },
    [updateProject],
  );

  const updatePdfSettings = useCallback(
    (pdfSettings: PdfSettings) => {
      updateProject((currentProject) => ({ ...currentProject, pdfSettings }));
    },
    [updateProject],
  );

  const updateOpenAIImageSettings = useCallback(
    (openAIImageSettings: OpenAIImageSettings) => {
      updateProject((currentProject) => ({ ...currentProject, openAIImageSettings }));
    },
    [updateProject],
  );

  const applyInitialDraft = useCallback(
    (draft: InitialProjectDraft) => {
      const timestamp = nowIso();
      updateProject((currentProject) => ({
        id: crypto.randomUUID(),
        settings: draft.settings,
        subjects: draft.subjects,
        pdfSettings: currentProject.pdfSettings,
        openAIImageSettings: currentProject.openAIImageSettings,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastBriefUpdatedAt: timestamp,
        ...(draft.etsySeoAnalysis
          ? {
              etsySeoAnalysis: draft.etsySeoAnalysis,
              lastEtsySeoGeneratedAt: timestamp,
            }
          : {}),
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
    updateOpenAIImageSettings,
    applyInitialDraft,
    addSubject,
    removeSubject,
    markImageApproved,
  };
};
