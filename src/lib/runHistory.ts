import type {
  CreateRunRevisionInput,
  FileAssetVariant,
  ManagedFile,
  Project,
  RunRevisionStage,
  RunRevisionSummary,
} from '../types';

const isReadyFile = (file: ManagedFile): boolean => file.reviewState !== 'rejected';

export type RunHistoryGroup = {
  stage: RunRevisionStage;
  label: string;
  revisions: RunRevisionSummary[];
};

const stageLabels: Record<RunRevisionStage, string> = {
  brief: 'Idea and brief',
  masks: 'Mask drafts',
  approval: 'Ready masks',
  coloring: 'Coloring pages',
  marketing: 'Marketing assets',
  export: 'Exports',
  restore: 'Loaded versions',
};

const stageOrder: RunRevisionStage[] = [
  'brief',
  'masks',
  'approval',
  'coloring',
  'marketing',
  'export',
  'restore',
];

const stageValues = new Set<RunRevisionStage>(stageOrder);
const kindValues = new Set<RunRevisionSummary['kind']>([
  'autosave',
  'manual',
  'generation',
  'restore-safety',
  'restore',
  'export',
]);

export const isRunRevisionSummary = (value: unknown): value is RunRevisionSummary => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const revision = value as Partial<RunRevisionSummary>;

  return (
    typeof revision.id === 'string' &&
    typeof revision.runId === 'string' &&
    typeof revision.projectId === 'string' &&
    typeof revision.sequenceNumber === 'number' &&
    typeof revision.stage === 'string' &&
    stageValues.has(revision.stage) &&
    typeof revision.kind === 'string' &&
    kindValues.has(revision.kind) &&
    typeof revision.label === 'string' &&
    typeof revision.fileCount === 'number' &&
    typeof revision.totalSizeBytes === 'number' &&
    typeof revision.isManual === 'boolean' &&
    typeof revision.isPinned === 'boolean' &&
    typeof revision.createdAt === 'string'
  );
};

export const getRunRevisionStageLabel = (stage: RunRevisionStage): string => stageLabels[stage];

export const inferRunRevisionStage = (project: Project, files: ManagedFile[]): RunRevisionStage => {
  if (project.lastArchiveExportAt) {
    return 'export';
  }

  if (files.some((file) => file.assetVariant?.startsWith('marketing-'))) {
    return 'marketing';
  }

  if (files.some((file) => file.assetVariant === 'coloring-page')) {
    return 'coloring';
  }

  if (files.some((file) => isReadyFile(file) && file.assetVariant === 'color')) {
    return 'approval';
  }

  if (files.some((file) => file.assetVariant === 'color')) {
    return 'masks';
  }

  return 'brief';
};

export const countFilesByVariant = (files: ManagedFile[]): Record<FileAssetVariant, number> =>
  files.reduce(
    (counts, file) => ({
      ...counts,
      [file.assetVariant]: (counts[file.assetVariant] ?? 0) + 1,
    }),
    {
      color: 0,
      'coloring-page': 0,
      'marketing-slogan': 0,
      'marketing-mask-sheet': 0,
      'marketing-children-scene': 0,
      'marketing-printer-scene': 0,
      'marketing-flat-lay-scene': 0,
    } satisfies Record<FileAssetVariant, number>,
  );

export const createAutosaveRevisionInput = (
  project: Project,
  files: ManagedFile[],
): CreateRunRevisionInput => {
  const stage = inferRunRevisionStage(project, files);
  const readyMaskCount = files.filter(
    (file) => file.assetVariant === 'color' && isReadyFile(file),
  ).length;

  return {
    stage,
    kind: files.length > 0 ? 'generation' : 'autosave',
    label:
      stage === 'approval'
        ? `Ready masks saved (${readyMaskCount})`
        : `${stageLabels[stage]} saved`,
    description: 'Saved automatically online.',
    changeSummary: {
      subjectCount: project.subjects.length,
      fileCount: files.length,
      approvedMaskCount: readyMaskCount,
      readyMaskCount,
      filesByVariant: countFilesByVariant(files),
    },
  };
};

export const groupRunRevisionsByStage = (revisions: RunRevisionSummary[]): RunHistoryGroup[] => {
  const groups = new Map<RunRevisionStage, RunRevisionSummary[]>();

  for (const revision of revisions.filter(isRunRevisionSummary)) {
    groups.set(revision.stage, [...(groups.get(revision.stage) ?? []), revision]);
  }

  return stageOrder
    .filter((stage) => groups.has(stage))
    .map((stage) => ({
      stage,
      label: stageLabels[stage],
      revisions: [...(groups.get(stage) ?? [])].sort(
        (left, right) => right.sequenceNumber - left.sequenceNumber,
      ),
    }));
};
