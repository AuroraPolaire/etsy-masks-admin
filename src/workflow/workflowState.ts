import { getCurrentColoringPageForSubject, getFileForSubject } from '../lib/files';

import type { ManagedFile, Project, QAResult } from '../types';

export type WorkflowStepId = 'brief' | 'images' | 'export';

export type WorkflowStepState = 'active' | 'available' | 'complete' | 'locked';

type StepperItem = {
  id: string;
  title: string;
  status: WorkflowStepState;
};

export type WorkflowStep = {
  id: WorkflowStepId;
  title: string;
  description: string;
  summary: string;
  complete: boolean;
  unlocked: boolean;
  lockedReason?: string;
};

export type WorkflowState = {
  subjectCount: number;
  approvedImageCount: number;
  approvedColoringPageCount: number;
  briefFieldsComplete: boolean;
  briefComplete: boolean;
  topicsComplete: boolean;
  imagesComplete: boolean;
  canExportFinalFiles: boolean;
  recommendedStepId: WorkflowStepId;
  visibleActiveStepId: WorkflowStepId;
  nextAction: string;
  steps: WorkflowStep[];
  stepperItems: StepperItem[];
  getStepState: (stepId: WorkflowStepId) => WorkflowStepState;
};

type CreateWorkflowStateParams = {
  project: Project;
  files: ManagedFile[];
  qaResult: QAResult;
  hasAIProvider: boolean;
  activeStepId: WorkflowStepId;
};

export const createWorkflowState = ({
  project,
  files,
  qaResult,
  hasAIProvider,
  activeStepId,
}: CreateWorkflowStateParams): WorkflowState => {
  const approvedImageCount = project.subjects.filter((subject) =>
    getFileForSubject(files, subject.id),
  ).length;
  const approvedColoringPageCount = project.subjects.filter((subject) => {
    const approvedColorFile = getFileForSubject(files, subject.id);

    return (
      approvedColorFile && getCurrentColoringPageForSubject(files, subject.id, approvedColorFile)
    );
  }).length;
  const subjectCount = project.subjects.length;
  const briefFieldsComplete = [
    project.settings.title,
    project.settings.theme,
    project.settings.description,
    project.settings.tags,
    project.settings.safetyNote,
    project.settings.printingInstructions,
    project.settings.license,
    project.settings.refundPolicy,
  ].every((value) => value.trim().length > 0);
  const briefComplete = Boolean(project.lastBriefUpdatedAt) && briefFieldsComplete;
  const topicsComplete = subjectCount > 0;
  const imagesComplete =
    topicsComplete &&
    approvedImageCount === subjectCount &&
    approvedColoringPageCount === subjectCount;
  const canExportFinalFiles = approvedImageCount > 0;
  const recommendedStepId: WorkflowStepId = !briefComplete
    ? 'brief'
    : !imagesComplete
      ? 'images'
      : 'export';
  const steps: WorkflowStep[] = [
    {
      id: 'brief',
      title: 'Idea and brief',
      description: 'Turn a product idea into buyer-facing listing copy.',
      summary: briefComplete
        ? `${project.settings.theme} brief is ready`
        : project.lastBriefUpdatedAt
          ? 'Complete title, description, tags, safety, license, and refund copy.'
          : 'Draft from an idea or edit the listing brief to start.',
      complete: briefComplete,
      unlocked: true,
    },
    {
      id: 'images',
      title: 'Topics and AI images',
      description: 'Add mask topics, generate color masks, and create coloring-page versions.',
      summary:
        subjectCount === 0
          ? 'No mask topics yet.'
          : `${subjectCount} topic${subjectCount === 1 ? '' : 's'}, ${approvedImageCount}/${subjectCount} color masks, ${approvedColoringPageCount}/${subjectCount} coloring pages.`,
      complete: imagesComplete,
      unlocked: briefComplete,
      lockedReason: 'Finish the brief first.',
    },
    {
      id: 'export',
      title: 'QA and export',
      description: 'Export color mask PNGs, coloring-page PNGs, and one listing PDF.',
      summary:
        qaResult.status === 'etsy-ready'
          ? 'Package is Etsy-ready.'
          : `QA is ${qaResult.readinessPercentage}% ready.`,
      complete: qaResult.status === 'etsy-ready',
      unlocked: imagesComplete,
      lockedReason: 'Approve color masks and generate coloring pages first.',
    },
  ];
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const visibleActiveStepId = stepById.get(activeStepId)?.unlocked
    ? activeStepId
    : recommendedStepId;
  const getStepState = (stepId: WorkflowStepId): WorkflowStepState => {
    const step = stepById.get(stepId);
    if (!step?.unlocked) {
      return 'locked';
    }

    if (visibleActiveStepId === stepId) {
      return 'active';
    }

    return step.complete ? 'complete' : 'available';
  };
  const stepperItems = steps.map(
    (step): StepperItem => ({
      id: step.id,
      title: step.title,
      status: getStepState(step.id),
    }),
  );
  const nextAction = !briefComplete
    ? 'Draft the brief or edit listing copy.'
    : !topicsComplete
      ? 'Add mask topics, then generate their images.'
      : !hasAIProvider && !imagesComplete
        ? 'Configure the backend OpenAI proxy before generating images.'
        : approvedImageCount !== subjectCount
          ? 'Generate and approve missing images.'
          : !imagesComplete
            ? 'Generate coloring pages for approved masks.'
            : qaResult.status === 'etsy-ready'
              ? 'Export the ZIP.'
              : 'Fix the remaining QA items.';

  return {
    subjectCount,
    approvedImageCount,
    approvedColoringPageCount,
    briefFieldsComplete,
    briefComplete,
    topicsComplete,
    imagesComplete,
    canExportFinalFiles,
    recommendedStepId,
    visibleActiveStepId,
    nextAction,
    steps,
    stepperItems,
    getStepState,
  };
};
