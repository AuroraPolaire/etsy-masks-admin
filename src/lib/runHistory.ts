import type {
  CreateRunRevisionInput,
  FileAssetVariant,
  ManagedFile,
  Project,
  RunRevisionStage,
  RunRevisionSummary,
} from '../types';

export type RunHistoryGroup = {
  stage: RunRevisionStage;
  label: string;
  revisions: RunRevisionSummary[];
};

const stageLabels: Record<RunRevisionStage, string> = {
  brief: 'Brief',
  masks: 'Masks',
  approval: 'Approval',
  coloring: 'Coloring pages',
  marketing: 'Marketing',
  export: 'Export',
  restore: 'Restores',
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

  if (files.some((file) => file.reviewState === 'approved' && file.assetVariant === 'color')) {
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
    } satisfies Record<FileAssetVariant, number>,
  );

export const createAutosaveRevisionInput = (
  project: Project,
  files: ManagedFile[],
): CreateRunRevisionInput => {
  const stage = inferRunRevisionStage(project, files);
  const approvedCount = files.filter(
    (file) => file.assetVariant === 'color' && file.reviewState === 'approved',
  ).length;

  return {
    stage,
    kind: files.length > 0 ? 'generation' : 'autosave',
    label:
      stage === 'approval'
        ? `Approved masks checkpoint (${approvedCount})`
        : `${stageLabels[stage]} checkpoint`,
    description: 'Automatic checkpoint from cloud autosave.',
    changeSummary: {
      subjectCount: project.subjects.length,
      fileCount: files.length,
      approvedMaskCount: approvedCount,
      filesByVariant: countFilesByVariant(files),
    },
  };
};

export const groupRunRevisionsByStage = (revisions: RunRevisionSummary[]): RunHistoryGroup[] => {
  const groups = new Map<RunRevisionStage, RunRevisionSummary[]>();

  for (const revision of revisions) {
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
