import type { Project } from '../types';

export const getProjectIdeaLabel = (project: Project): string => {
  const candidates = [
    project.settings.theme,
    project.settings.title,
    project.settings.description.split('\n')[0] ?? '',
  ];

  return candidates.find((candidate) => candidate.trim().length > 0)?.trim() ?? 'Untitled idea';
};
