import { getFileForSubject } from '../lib/files';

import type { StepperItem } from '../components/ui/Stepper';
import type { ManagedFile, Project, QAResult } from '../types';

export type WorkflowStepId = 'brief' | 'topics' | 'images' | 'outputs' | 'export';

export type WorkflowStepState = 'active' | 'available' | 'complete' | 'locked';

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
  pdfCount: number;
  previewCount: number;
  hasRequiredPdfs: boolean;
  briefFieldsComplete: boolean;
  briefComplete: boolean;
  topicsComplete: boolean;
  imagesComplete: boolean;
  outputsComplete: boolean;
  canGenerateOutputs: boolean;
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
  hasOpenAIKey: boolean;
  activeStepId: WorkflowStepId;
};

const hasPdfFile = (files: ManagedFile[], suffix: string): boolean =>
  files.some((file) => file.kind === 'generated-pdf' && file.name.includes(suffix));

export const createWorkflowState = ({
  project,
  files,
  qaResult,
  hasOpenAIKey,
  activeStepId,
}: CreateWorkflowStateParams): WorkflowState => {
  const approvedImageCount = project.subjects.filter((subject) =>
    getFileForSubject(files, subject.id),
  ).length;
  const subjectCount = project.subjects.length;
  const pdfCount = files.filter((file) => file.kind === 'generated-pdf').length;
  const previewCount = files.filter((file) => file.kind === 'generated-preview').length;
  const hasRequiredPdfs =
    (!project.pdfSettings.generateA4 || hasPdfFile(files, '_A4_printable.pdf')) &&
    (!project.pdfSettings.generateUSLetter || hasPdfFile(files, '_US_Letter_printable.pdf'));
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
  const imagesComplete = topicsComplete && approvedImageCount === subjectCount;
  const outputsComplete = imagesComplete && hasRequiredPdfs && previewCount >= 5;
  const canGenerateOutputs = approvedImageCount > 0;
  const recommendedStepId: WorkflowStepId = !briefComplete
    ? 'brief'
    : !topicsComplete
      ? 'topics'
      : !imagesComplete
        ? 'images'
        : !outputsComplete
          ? 'outputs'
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
      id: 'topics',
      title: 'Topics',
      description: 'Choose the masks included in the bundle.',
      summary: `${subjectCount} topic${subjectCount === 1 ? '' : 's'} configured.`,
      complete: topicsComplete,
      unlocked: briefComplete,
      lockedReason: 'Finish the brief first.',
    },
    {
      id: 'images',
      title: 'AI images',
      description: 'Generate or upload images, then approve one per topic.',
      summary: `${approvedImageCount}/${subjectCount} topics have approved images.`,
      complete: imagesComplete,
      unlocked: topicsComplete,
      lockedReason: 'Add at least one topic first.',
    },
    {
      id: 'outputs',
      title: 'PDFs and previews',
      description: 'Create printable PDFs and marketplace preview images.',
      summary: `${pdfCount} PDF files and ${previewCount} preview images generated.`,
      complete: outputsComplete,
      unlocked: imagesComplete,
      lockedReason: 'Approve one image per topic first.',
    },
    {
      id: 'export',
      title: 'QA and export',
      description: 'Check readiness and export the final ZIP.',
      summary:
        qaResult.status === 'etsy-ready'
          ? 'Package is Etsy-ready.'
          : `QA is ${qaResult.readinessPercentage}% ready.`,
      complete: qaResult.status === 'etsy-ready',
      unlocked: outputsComplete,
      lockedReason: 'Generate required PDFs and at least five previews first.',
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
      ? 'Add the mask topics for this bundle.'
      : !hasOpenAIKey && !imagesComplete
        ? 'Add an OpenAI key in Settings or upload images.'
        : !imagesComplete
          ? 'Generate and approve missing images.'
          : !hasRequiredPdfs
            ? 'Generate printable PDFs.'
            : previewCount < 5
              ? 'Generate marketplace previews.'
              : qaResult.status === 'etsy-ready'
                ? 'Export the final ZIP.'
                : 'Fix the remaining QA items.';

  return {
    subjectCount,
    approvedImageCount,
    pdfCount,
    previewCount,
    hasRequiredPdfs,
    briefFieldsComplete,
    briefComplete,
    topicsComplete,
    imagesComplete,
    outputsComplete,
    canGenerateOutputs,
    recommendedStepId,
    visibleActiveStepId,
    nextAction,
    steps,
    stepperItems,
    getStepState,
  };
};
