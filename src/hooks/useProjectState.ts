import { useCallback, useEffect, useState } from 'react';

import { nowIso } from '../lib/dates';
import { loadProject, saveProject } from '../lib/storage';

import type {
  OpenAIImageSettings,
  MarketingSettings,
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

const clearAiListingReview = (project: Project): Project => {
  const projectWithoutAiReview = { ...project };
  delete projectWithoutAiReview.etsySeoAnalysis;
  delete projectWithoutAiReview.lastEtsySeoGeneratedAt;
  return projectWithoutAiReview;
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
      updateProject((currentProject) => {
        const nextProject = clearAiListingReview(currentProject);

        return {
          ...nextProject,
          settings,
          lastBriefUpdatedAt: nowIso(),
        };
      });
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

  const updateMarketingSettings = useCallback(
    (marketingSettings: MarketingSettings) => {
      updateProject((currentProject) => ({ ...currentProject, marketingSettings }));
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
        marketingSettings: currentProject.marketingSettings,
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
      updateProject((currentProject) => {
        const nextProject = clearAiListingReview(currentProject);

        return {
          ...nextProject,
          subjects: [...nextProject.subjects, { id: crypto.randomUUID(), name }],
        };
      });
    },
    [updateProject],
  );

  const removeSubject = useCallback(
    (subjectId: string) => {
      updateProject((currentProject) => {
        const nextProject = clearAiListingReview(currentProject);

        return {
          ...nextProject,
          subjects: nextProject.subjects.filter((subject) => subject.id !== subjectId),
        };
      });
    },
    [updateProject],
  );

  const applyEtsySeoAnalysis = useCallback(
    (etsySeoAnalysis: EtsySeoAnalysis) => {
      const timestamp = nowIso();
      updateProject((currentProject) => ({
        ...currentProject,
        etsySeoAnalysis,
        lastEtsySeoGeneratedAt: timestamp,
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
    updateMarketingSettings,
    applyInitialDraft,
    applyEtsySeoAnalysis,
    addSubject,
    removeSubject,
    markImageApproved,
  };
};
