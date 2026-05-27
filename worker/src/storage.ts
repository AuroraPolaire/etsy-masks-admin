import {
  ApiError,
  getMaxFileBytes,
  isBlobLike,
  isRecord,
  nowIso,
  readBoolean,
  readNumber,
  readOptionalString,
  readRequiredString,
} from './http';

import type {
  BackendEventRow,
  Env,
  FileObjectRow,
  FileMetadataInput,
  FileRow,
  ProjectRunRow,
  ProjectRunStatus,
  RunRevisionKind,
  RunRevisionRow,
  RunRevisionStage,
} from './types';

type RunSummaryRow = {
  id: string;
  project_id: string;
  idea: string;
  status: ProjectRunStatus;
  created_at: string;
  updated_at: string;
  file_count: number;
  total_size_bytes: number;
};

export type RunSummary = {
  id: string;
  projectId: string;
  idea: string;
  status: ProjectRunStatus;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  totalSizeBytes: number;
};

export type RunSnapshot = {
  runId: string;
  idea: string;
  status: ProjectRunStatus;
  project: unknown;
  updatedAt: string;
  files: Array<Record<string, unknown>>;
  events: Array<Record<string, string>>;
};

export type RunRevisionSummary = {
  id: string;
  runId: string;
  projectId: string;
  parentRevisionId?: string;
  sequenceNumber: number;
  stage: RunRevisionStage;
  kind: RunRevisionKind;
  label: string;
  description?: string;
  changeSummary?: Record<string, unknown>;
  thumbnailFileId?: string;
  fileCount: number;
  totalSizeBytes: number;
  isManual: boolean;
  isPinned: boolean;
  restoredFromRevisionId?: string;
  createdAt: string;
};

export type RunRevisionDetail = RunRevisionSummary & {
  project: unknown;
  files: Array<Record<string, unknown>>;
};

export type CreateRunRevisionInput = {
  stage: RunRevisionStage;
  kind: RunRevisionKind;
  label: string;
  description?: string;
  changeSummary?: Record<string, unknown>;
  thumbnailFileId?: string;
  isManual?: boolean;
  isPinned?: boolean;
  restoredFromRevisionId?: string;
};

export type UpdateRunRevisionInput = {
  label?: string;
  description?: string;
  isPinned?: boolean;
};

export type RestoreRunRevisionInput = {
  mode: 'full' | 'project-only' | 'files-only';
};

export type RestoreRunRevisionResult = {
  safetyRevision: RunRevisionSummary;
  restoredRevision: RunRevisionSummary;
  snapshot: RunSnapshot;
};

export type CreateRunInput = {
  idea: string;
  project: Record<string, unknown>;
};

export type UpdateRunInput = CreateRunInput;

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

const sanitizeObjectId = (objectId: string): string =>
  objectId
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const runSummaryFromRow = (row: RunSummaryRow): RunSummary => ({
  id: row.id,
  projectId: row.project_id,
  idea: row.idea,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  fileCount: row.file_count,
  totalSizeBytes: row.total_size_bytes,
});

const fileRowToRecord = (row: FileRow): Record<string, unknown> => {
  const imageMetadata =
    row.image_width !== null && row.image_height !== null
      ? {
          width: row.image_width,
          height: row.image_height,
        }
      : undefined;
  const metadata = row.metadata_json
    ? (() => {
        try {
          const parsed = JSON.parse(row.metadata_json) as unknown;
          return isRecord(parsed) ? parsed : undefined;
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return {
    id: row.id,
    runId: row.run_id,
    projectId: row.project_id,
    name: row.name,
    originalName: row.original_name,
    size: row.size,
    type: row.type,
    kind: row.kind,
    addedAt: row.added_at,
    reviewState: row.review_state,
    reviewNotes: row.review_notes,
    assetVariant: row.asset_variant || 'color',
    explicitlyConfirmed: row.explicitly_confirmed === 1,
    updatedAt: row.updated_at,
    ...(row.object_id ? { objectId: row.object_id } : {}),
    ...(row.mapped_subject_id ? { mappedSubjectId: row.mapped_subject_id } : {}),
    ...(row.source_file_id ? { sourceFileId: row.source_file_id } : {}),
    ...(metadata ?? {}),
    ...(imageMetadata ? { imageMetadata } : {}),
    ...(row.thumbnail_r2_key && row.thumbnail_size !== null && row.thumbnail_type
      ? {
          thumbnail: {
            size: row.thumbnail_size,
            type: row.thumbnail_type,
            updatedAt: row.thumbnail_updated_at ?? row.updated_at,
          },
        }
      : {}),
  };
};

const eventRowToRecord = (row: BackendEventRow): Record<string, string> => ({
  id: row.id,
  type: row.type,
  message: row.message,
  createdAt: row.created_at,
});

const parseJsonRecord = (value: string | null): Record<string, unknown> | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseJsonArray = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const revisionSummaryFromRow = (row: RunRevisionRow): RunRevisionSummary => {
  const changeSummary = parseJsonRecord(row.change_summary_json);

  return {
    id: row.id,
    runId: row.run_id,
    projectId: row.project_id,
    ...(row.parent_revision_id ? { parentRevisionId: row.parent_revision_id } : {}),
    sequenceNumber: row.sequence_number,
    stage: row.stage,
    kind: row.kind,
    label: row.label,
    ...(row.description ? { description: row.description } : {}),
    ...(changeSummary ? { changeSummary } : {}),
    ...(row.thumbnail_file_id ? { thumbnailFileId: row.thumbnail_file_id } : {}),
    fileCount: row.file_count,
    totalSizeBytes: row.total_size_bytes,
    isManual: row.is_manual === 1,
    isPinned: row.is_pinned === 1,
    ...(row.restored_from_revision_id
      ? { restoredFromRevisionId: row.restored_from_revision_id }
      : {}),
    createdAt: row.created_at,
  };
};

export const createRunRevisionFileManifest = (rows: FileRow[]): Array<Record<string, unknown>> =>
  rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    projectId: row.project_id,
    objectId: row.object_id,
    r2Key: row.r2_key,
    name: row.name,
    originalName: row.original_name,
    size: row.size,
    type: row.type,
    kind: row.kind,
    addedAt: row.added_at,
    reviewState: row.review_state,
    reviewNotes: row.review_notes,
    mappedSubjectId: row.mapped_subject_id,
    assetVariant: row.asset_variant || 'color',
    sourceFileId: row.source_file_id,
    metadataJson: row.metadata_json,
    explicitlyConfirmed: row.explicitly_confirmed === 1,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    thumbnailR2Key: row.thumbnail_r2_key,
    thumbnailSize: row.thumbnail_size,
    thumbnailType: row.thumbnail_type,
    thumbnailUpdatedAt: row.thumbnail_updated_at,
    updatedAt: row.updated_at,
  }));

const manifestRecordToFileRow = (
  value: unknown,
  runId: string,
  fallbackProjectId: string,
  restoredAt: string,
): FileRow | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = readOptionalString(value.id);
  const r2Key = readOptionalString(value.r2Key);
  const name = readOptionalString(value.name);
  const originalName = readOptionalString(value.originalName);
  const type = readOptionalString(value.type);
  const kind = readOptionalString(value.kind);
  const addedAt = readOptionalString(value.addedAt);
  const reviewState = readOptionalString(value.reviewState);

  if (!id || !r2Key || !name || !originalName || !type || !kind || !addedAt || !reviewState) {
    return null;
  }

  return {
    id,
    run_id: runId,
    project_id: readOptionalString(value.projectId) ?? fallbackProjectId,
    object_id: readOptionalString(value.objectId) ?? null,
    r2_key: r2Key,
    name,
    original_name: originalName,
    size: typeof value.size === 'number' && Number.isFinite(value.size) ? value.size : 0,
    type,
    kind,
    added_at: addedAt,
    review_state: reviewState,
    review_notes: typeof value.reviewNotes === 'string' ? value.reviewNotes : '',
    mapped_subject_id: readOptionalString(value.mappedSubjectId) ?? null,
    asset_variant: readOptionalString(value.assetVariant) ?? 'color',
    source_file_id: readOptionalString(value.sourceFileId) ?? null,
    metadata_json: typeof value.metadataJson === 'string' ? value.metadataJson : null,
    explicitly_confirmed: value.explicitlyConfirmed === true ? 1 : 0,
    image_width:
      typeof value.imageWidth === 'number' && Number.isFinite(value.imageWidth)
        ? value.imageWidth
        : null,
    image_height:
      typeof value.imageHeight === 'number' && Number.isFinite(value.imageHeight)
        ? value.imageHeight
        : null,
    thumbnail_r2_key: readOptionalString(value.thumbnailR2Key) ?? null,
    thumbnail_size:
      typeof value.thumbnailSize === 'number' && Number.isFinite(value.thumbnailSize)
        ? value.thumbnailSize
        : null,
    thumbnail_type: readOptionalString(value.thumbnailType) ?? null,
    thumbnail_updated_at: readOptionalString(value.thumbnailUpdatedAt) ?? null,
    updated_at: readOptionalString(value.updatedAt) ?? restoredAt,
  };
};

const validRevisionStages: RunRevisionStage[] = [
  'brief',
  'masks',
  'approval',
  'coloring',
  'marketing',
  'export',
  'restore',
];

const validRevisionKinds: RunRevisionKind[] = [
  'autosave',
  'manual',
  'generation',
  'restore-safety',
  'restore',
  'export',
];

const readRevisionStage = (value: unknown): RunRevisionStage => {
  const stage = readRequiredString(value, 'stage') as RunRevisionStage;
  if (!validRevisionStages.includes(stage)) {
    throw new ApiError(400, 'stage is invalid.');
  }

  return stage;
};

const readRevisionKind = (value: unknown): RunRevisionKind => {
  const kind = readRequiredString(value, 'kind') as RunRevisionKind;
  if (!validRevisionKinds.includes(kind)) {
    throw new ApiError(400, 'kind is invalid.');
  }

  return kind;
};

export const parseCreateRunRevisionInput = (
  body: Record<string, unknown>,
): CreateRunRevisionInput => {
  const changeSummary = isRecord(body.changeSummary) ? body.changeSummary : undefined;
  const description = readOptionalString(body.description);
  const thumbnailFileId = readOptionalString(body.thumbnailFileId);
  const restoredFromRevisionId = readOptionalString(body.restoredFromRevisionId);
  const input: CreateRunRevisionInput = {
    stage: readRevisionStage(body.stage),
    kind: readRevisionKind(body.kind),
    label: readRequiredString(body.label, 'label'),
  };

  if (description) {
    input.description = description;
  }
  if (changeSummary) {
    input.changeSummary = changeSummary;
  }
  if (thumbnailFileId) {
    input.thumbnailFileId = thumbnailFileId;
  }
  if (typeof body.isManual === 'boolean') {
    input.isManual = body.isManual;
  }
  if (typeof body.isPinned === 'boolean') {
    input.isPinned = body.isPinned;
  }
  if (restoredFromRevisionId) {
    input.restoredFromRevisionId = restoredFromRevisionId;
  }

  return input;
};

export const parseUpdateRunRevisionInput = (
  body: Record<string, unknown>,
): UpdateRunRevisionInput => {
  const input: UpdateRunRevisionInput = {};
  if (typeof body.label === 'string') {
    input.label = body.label.trim();
  }
  if (typeof body.description === 'string') {
    input.description = body.description.trim();
  }
  if (typeof body.isPinned === 'boolean') {
    input.isPinned = body.isPinned;
  }

  return input;
};

export const parseRestoreRunRevisionInput = (
  body: Record<string, unknown>,
): RestoreRunRevisionInput => {
  const mode = readOptionalString(body.mode) ?? 'full';
  if (mode !== 'full' && mode !== 'project-only' && mode !== 'files-only') {
    throw new ApiError(400, 'mode is invalid.');
  }

  return { mode };
};

const createStableDraftRunId = async (projectId: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(projectId));
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);

  return `draft-${hash}`;
};

export const insertEvent = async (env: Env, type: string, message: string): Promise<void> => {
  await env.DB.prepare(
    'INSERT INTO backend_events (id, type, message, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(crypto.randomUUID(), type, message, nowIso())
    .run();
};

const deleteR2Keys = async (env: Env, keys: string[]): Promise<void> => {
  if (keys.length > 0) {
    await env.FILES.delete(keys);
  }
};

export const listRuns = async (env: Env): Promise<RunSummary[]> => {
  const rows = await env.DB.prepare(
    `SELECT
       runs.id,
       runs.project_id,
       runs.idea,
       runs.status,
       runs.created_at,
       runs.updated_at,
       COUNT(files.id) AS file_count,
       COALESCE(SUM(files.size), 0) AS total_size_bytes
     FROM project_runs runs
     LEFT JOIN file_backups files ON files.run_id = runs.id
     GROUP BY
       runs.id,
       runs.project_id,
       runs.idea,
       runs.status,
       runs.created_at,
       runs.updated_at
     ORDER BY runs.updated_at DESC`,
  ).all<RunSummaryRow>();

  return (rows.results ?? []).map(runSummaryFromRow);
};

const getRunSummary = async (env: Env, runId: string): Promise<RunSummary> => {
  const row = await env.DB.prepare(
    `SELECT
       runs.id,
       runs.project_id,
       runs.idea,
       runs.status,
       runs.created_at,
       runs.updated_at,
       COUNT(files.id) AS file_count,
       COALESCE(SUM(files.size), 0) AS total_size_bytes
     FROM project_runs runs
     LEFT JOIN file_backups files ON files.run_id = runs.id
     WHERE runs.id = ?
     GROUP BY
       runs.id,
       runs.project_id,
       runs.idea,
       runs.status,
       runs.created_at,
       runs.updated_at`,
  )
    .bind(runId)
    .first<RunSummaryRow>();

  if (!row) {
    throw new ApiError(404, 'Run was not found.');
  }

  return runSummaryFromRow(row);
};

const getReusableRunIdForProject = async (env: Env, projectId: string): Promise<string> => {
  const row = await env.DB.prepare(
    `SELECT id
     FROM project_runs
     WHERE project_id = ?
     ORDER BY
       CASE WHEN status = 'draft' THEN 0 ELSE 1 END,
       updated_at DESC
     LIMIT 1`,
  )
    .bind(projectId)
    .first<Pick<ProjectRunRow, 'id'>>();

  return row?.id ?? '';
};

export const createRun = async (env: Env, input: CreateRunInput): Promise<RunSummary> => {
  const projectId = readRequiredString(input.project.id, 'project.id');
  const idea = input.idea.trim() || 'Untitled idea';
  const status: ProjectRunStatus = 'draft';
  const timestamp = nowIso();
  const reusableRunId = await getReusableRunIdForProject(env, projectId);
  const runId = reusableRunId || (await createStableDraftRunId(projectId));

  await env.DB.prepare(
    reusableRunId
      ? `UPDATE project_runs
         SET project_id = ?,
             idea = ?,
             project_json = ?,
             status = ?,
             updated_at = ?,
             finalized_at = ?
         WHERE id = ?`
      : `INSERT INTO project_runs (
       id, project_id, idea, project_json, status, created_at, updated_at, finalized_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       project_id = excluded.project_id,
       idea = excluded.idea,
       project_json = excluded.project_json,
       status = excluded.status,
       updated_at = excluded.updated_at,
       finalized_at = NULL`,
  )
    .bind(
      ...(reusableRunId
        ? [projectId, idea, JSON.stringify(input.project), status, timestamp, null, runId]
        : [
            runId,
            projectId,
            idea,
            JSON.stringify(input.project),
            status,
            timestamp,
            timestamp,
            null,
          ]),
    )
    .run();
  await insertEvent(
    env,
    reusableRunId ? 'run-updated' : 'run-created',
    reusableRunId
      ? `Reused draft run "${idea}" for project ${projectId}.`
      : `Saved draft run "${idea}" to D1.`,
  );

  return getRunSummary(env, runId);
};

export const updateRun = async (
  env: Env,
  runId: string,
  input: UpdateRunInput,
): Promise<RunSummary> => {
  const existing = await env.DB.prepare('SELECT id FROM project_runs WHERE id = ?')
    .bind(runId)
    .first<Pick<ProjectRunRow, 'id'>>();

  if (!existing) {
    throw new ApiError(404, 'Run was not found.');
  }

  const projectId = readRequiredString(input.project.id, 'project.id');
  const idea = input.idea.trim() || 'Untitled idea';
  const status: ProjectRunStatus = 'draft';
  const timestamp = nowIso();

  await env.DB.prepare(
    `UPDATE project_runs
     SET project_id = ?,
         idea = ?,
         project_json = ?,
         status = ?,
         updated_at = ?,
         finalized_at = ?
     WHERE id = ?`,
  )
    .bind(projectId, idea, JSON.stringify(input.project), status, timestamp, null, runId)
    .run();

  await insertEvent(env, 'run-updated', `Updated draft run "${idea}".`);
  return getRunSummary(env, runId);
};

export const getRunSnapshot = async (env: Env, runId?: string): Promise<RunSnapshot | null> => {
  const run = runId
    ? await env.DB.prepare(
        `SELECT id, project_id, idea, project_json, status, created_at, updated_at
         FROM project_runs
         WHERE id = ?`,
      )
        .bind(runId)
        .first<ProjectRunRow>()
    : await env.DB.prepare(
        `SELECT id, project_id, idea, project_json, status, created_at, updated_at
         FROM project_runs
         ORDER BY updated_at DESC
         LIMIT 1`,
      ).first<ProjectRunRow>();

  if (!run) {
    return null;
  }

  const fileRows = await env.DB.prepare(
    'SELECT * FROM file_backups WHERE run_id = ? ORDER BY added_at ASC',
  )
    .bind(run.id)
    .all<FileRow>();
  const eventRows = await env.DB.prepare(
    'SELECT id, type, message, created_at FROM backend_events ORDER BY created_at DESC LIMIT 20',
  ).all<BackendEventRow>();

  return {
    runId: run.id,
    idea: run.idea,
    status: run.status,
    project: JSON.parse(run.project_json) as unknown,
    updatedAt: run.updated_at,
    files: (fileRows.results ?? []).map(fileRowToRecord),
    events: (eventRows.results ?? []).map(eventRowToRecord),
  };
};

const getRunRow = async (env: Env, runId: string): Promise<ProjectRunRow> => {
  const run = await env.DB.prepare(
    `SELECT id, project_id, idea, project_json, status, created_at, updated_at
     FROM project_runs
     WHERE id = ?`,
  )
    .bind(runId)
    .first<ProjectRunRow>();

  if (!run) {
    throw new ApiError(404, 'Run was not found.');
  }

  return run;
};

const getRunRevisionRow = async (
  env: Env,
  runId: string,
  revisionId: string,
): Promise<RunRevisionRow> => {
  const revision = await env.DB.prepare('SELECT * FROM run_revisions WHERE run_id = ? AND id = ?')
    .bind(runId, revisionId)
    .first<RunRevisionRow>();

  if (!revision) {
    throw new ApiError(404, 'Run revision was not found.');
  }

  return revision;
};

export const listRunRevisions = async (env: Env, runId: string): Promise<RunRevisionSummary[]> => {
  await getRunRow(env, runId);
  const rows = await env.DB.prepare(
    `SELECT *
     FROM run_revisions
     WHERE run_id = ?
     ORDER BY sequence_number DESC`,
  )
    .bind(runId)
    .all<RunRevisionRow>();

  return (rows.results ?? []).map(revisionSummaryFromRow);
};

const getNextRevisionSequence = async (env: Env, runId: string): Promise<number> => {
  const row = await env.DB.prepare(
    'SELECT COALESCE(MAX(sequence_number), 0) AS sequence_number FROM run_revisions WHERE run_id = ?',
  )
    .bind(runId)
    .first<{ sequence_number: number }>();

  return (row?.sequence_number ?? 0) + 1;
};

const getLatestRevisionId = async (env: Env, runId: string): Promise<string | null> => {
  const row = await env.DB.prepare(
    'SELECT id FROM run_revisions WHERE run_id = ? ORDER BY sequence_number DESC LIMIT 1',
  )
    .bind(runId)
    .first<Pick<RunRevisionRow, 'id'>>();

  return row?.id ?? null;
};

export const createRunRevision = async (
  env: Env,
  runId: string,
  input: CreateRunRevisionInput,
): Promise<RunRevisionSummary> => {
  const run = await getRunRow(env, runId);
  const fileRows = await env.DB.prepare(
    'SELECT * FROM file_backups WHERE run_id = ? ORDER BY added_at ASC',
  )
    .bind(runId)
    .all<FileRow>();
  const files = fileRows.results ?? [];
  const manifest = createRunRevisionFileManifest(files);
  const revisionId = crypto.randomUUID();
  const sequenceNumber = await getNextRevisionSequence(env, runId);
  const timestamp = nowIso();
  const parentRevisionId = await getLatestRevisionId(env, runId);
  const totalSizeBytes = files.reduce((total, file) => total + file.size, 0);

  await env.DB.prepare(
    `INSERT INTO run_revisions (
       id, run_id, project_id, parent_revision_id, sequence_number, stage, kind, label,
       description, project_json, file_manifest_json, change_summary_json, thumbnail_file_id,
       file_count, total_size_bytes, is_manual, is_pinned, restored_from_revision_id, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      revisionId,
      runId,
      run.project_id,
      parentRevisionId,
      sequenceNumber,
      input.stage,
      input.kind,
      input.label,
      input.description ?? null,
      run.project_json,
      JSON.stringify(manifest),
      input.changeSummary ? JSON.stringify(input.changeSummary) : null,
      input.thumbnailFileId ?? null,
      files.length,
      totalSizeBytes,
      input.isManual ? 1 : 0,
      input.isPinned ? 1 : 0,
      input.restoredFromRevisionId ?? null,
      timestamp,
    )
    .run();

  for (const file of files) {
    await env.DB.prepare(
      `INSERT INTO run_revision_files (revision_id, run_id, file_id, object_id)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(revisionId, runId, file.id, file.object_id ?? null)
      .run();
  }

  await insertEvent(env, 'run-revision-created', `Created checkpoint "${input.label}".`);
  return revisionSummaryFromRow(await getRunRevisionRow(env, runId, revisionId));
};

export const getRunRevision = async (
  env: Env,
  runId: string,
  revisionId: string,
): Promise<RunRevisionDetail> => {
  const revision = await getRunRevisionRow(env, runId, revisionId);
  const manifestRows = parseJsonArray(revision.file_manifest_json)
    .map((item) => manifestRecordToFileRow(item, runId, revision.project_id, revision.created_at))
    .filter((row): row is FileRow => Boolean(row));

  return {
    ...revisionSummaryFromRow(revision),
    project: JSON.parse(revision.project_json) as unknown,
    files: manifestRows.map(fileRowToRecord),
  };
};

export const updateRunRevision = async (
  env: Env,
  runId: string,
  revisionId: string,
  input: UpdateRunRevisionInput,
): Promise<RunRevisionSummary> => {
  await getRunRevisionRow(env, runId, revisionId);
  const label = input.label?.trim();
  if (input.label !== undefined && !label) {
    throw new ApiError(400, 'label cannot be empty.');
  }

  await env.DB.prepare(
    `UPDATE run_revisions
     SET label = COALESCE(?, label),
         description = COALESCE(?, description),
         is_pinned = COALESCE(?, is_pinned)
     WHERE run_id = ? AND id = ?`,
  )
    .bind(
      label ?? null,
      input.description ?? null,
      input.isPinned === undefined ? null : input.isPinned ? 1 : 0,
      runId,
      revisionId,
    )
    .run();

  return revisionSummaryFromRow(await getRunRevisionRow(env, runId, revisionId));
};

const insertRestoredFileRow = async (env: Env, row: FileRow): Promise<void> => {
  await env.DB.prepare(
    `INSERT INTO file_backups (
       id, run_id, project_id, object_id, r2_key, name, original_name, size, type, kind, added_at,
       review_state, review_notes, mapped_subject_id, asset_variant, source_file_id, metadata_json,
       explicitly_confirmed, image_width, image_height, thumbnail_r2_key, thumbnail_size,
       thumbnail_type, thumbnail_updated_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.run_id,
      row.project_id,
      row.object_id,
      row.r2_key,
      row.name,
      row.original_name,
      row.size,
      row.type,
      row.kind,
      row.added_at,
      row.review_state,
      row.review_notes,
      row.mapped_subject_id,
      row.asset_variant,
      row.source_file_id,
      row.metadata_json,
      row.explicitly_confirmed,
      row.image_width,
      row.image_height,
      row.thumbnail_r2_key,
      row.thumbnail_size,
      row.thumbnail_type,
      row.thumbnail_updated_at,
      row.updated_at,
    )
    .run();
};

export const restoreRunRevision = async (
  env: Env,
  runId: string,
  revisionId: string,
  input: RestoreRunRevisionInput,
): Promise<RestoreRunRevisionResult> => {
  const revision = await getRunRevisionRow(env, runId, revisionId);
  const timestamp = nowIso();
  const safetyRevision = await createRunRevision(env, runId, {
    stage: 'restore',
    kind: 'restore-safety',
    label: `Before restore: ${revision.label}`,
    description: 'Automatic safety checkpoint created before restoring history.',
    isPinned: true,
  });

  if (input.mode !== 'files-only') {
    await env.DB.prepare(
      `UPDATE project_runs
       SET project_id = ?,
           project_json = ?,
           updated_at = ?
       WHERE id = ?`,
    )
      .bind(revision.project_id, revision.project_json, timestamp, runId)
      .run();
  }

  if (input.mode !== 'project-only') {
    const manifestRows = parseJsonArray(revision.file_manifest_json)
      .map((item) => manifestRecordToFileRow(item, runId, revision.project_id, timestamp))
      .filter((row): row is FileRow => Boolean(row));

    await env.DB.prepare('DELETE FROM file_backups WHERE run_id = ?').bind(runId).run();
    for (const row of manifestRows) {
      await insertRestoredFileRow(env, row);
    }
    await env.DB.prepare('UPDATE project_runs SET updated_at = ? WHERE id = ?')
      .bind(timestamp, runId)
      .run();
  }

  const restoredRevision = await createRunRevision(env, runId, {
    stage: 'restore',
    kind: 'restore',
    label: `Restored: ${revision.label}`,
    description: `Restored checkpoint ${revision.sequence_number}.`,
    restoredFromRevisionId: revision.id,
  });
  const snapshot = await getRunSnapshot(env, runId);
  if (!snapshot) {
    throw new ApiError(404, 'Run was not found after restore.');
  }

  await insertEvent(env, 'run-revision-restored', `Restored checkpoint "${revision.label}".`);
  return { safetyRevision, restoredRevision, snapshot };
};

const parseFileMetadata = (value: unknown): FileMetadataInput => {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'metadata form field is required.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new ApiError(400, 'metadata form field must be valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new ApiError(400, 'metadata must be a JSON object.');
  }

  const imageMetadata = isRecord(parsed.imageMetadata)
    ? {
        width: readNumber(parsed.imageMetadata.width, 'metadata.imageMetadata.width'),
        height: readNumber(parsed.imageMetadata.height, 'metadata.imageMetadata.height'),
      }
    : undefined;
  const mappedSubjectId = readOptionalString(parsed.mappedSubjectId);
  const assetVariant = readOptionalString(parsed.assetVariant) ?? 'color';
  const validAssetVariants = [
    'color',
    'coloring-page',
    'marketing-slogan',
    'marketing-mask-sheet',
    'marketing-children-scene',
  ];
  if (!validAssetVariants.includes(assetVariant)) {
    throw new ApiError(400, 'metadata.assetVariant is invalid.');
  }
  const sourceFileId = readOptionalString(parsed.sourceFileId);
  const metadataJson = isRecord(parsed.marketingAsset)
    ? JSON.stringify({ marketingAsset: parsed.marketingAsset })
    : undefined;

  return {
    id: readRequiredString(parsed.id, 'metadata.id'),
    projectId: readRequiredString(parsed.projectId, 'metadata.projectId'),
    name: readRequiredString(parsed.name, 'metadata.name'),
    originalName: readRequiredString(parsed.originalName, 'metadata.originalName'),
    size: readNumber(parsed.size, 'metadata.size'),
    type: readRequiredString(parsed.type, 'metadata.type'),
    kind: readRequiredString(parsed.kind, 'metadata.kind'),
    addedAt: readRequiredString(parsed.addedAt, 'metadata.addedAt'),
    reviewState: readRequiredString(parsed.reviewState, 'metadata.reviewState'),
    reviewNotes: typeof parsed.reviewNotes === 'string' ? parsed.reviewNotes : '',
    assetVariant,
    ...(sourceFileId ? { sourceFileId } : {}),
    ...(metadataJson ? { metadataJson } : {}),
    explicitlyConfirmed: readBoolean(parsed.explicitlyConfirmed, 'metadata.explicitlyConfirmed'),
    ...(mappedSubjectId ? { mappedSubjectId } : {}),
    ...(imageMetadata ? { imageMetadata } : {}),
  };
};

export const putRunFile = async (
  env: Env,
  runId: string,
  fileId: string,
  formData: FormData,
): Promise<void> => {
  const fileValue: unknown = formData.get('file');
  if (!isBlobLike(fileValue)) {
    throw new ApiError(400, 'file form field is required.');
  }

  if (fileValue.size > getMaxFileBytes(env)) {
    throw new ApiError(413, 'File is larger than the configured backend limit.');
  }
  const thumbnailValue: unknown = formData.get('thumbnail');
  if (thumbnailValue !== null && !isBlobLike(thumbnailValue)) {
    throw new ApiError(400, 'thumbnail form field must be a file.');
  }
  const thumbnailBlob = isBlobLike(thumbnailValue) ? thumbnailValue : null;

  const run = await env.DB.prepare('SELECT id, project_id FROM project_runs WHERE id = ?')
    .bind(runId)
    .first<Pick<ProjectRunRow, 'id' | 'project_id'>>();
  if (!run) {
    throw new ApiError(404, 'Run was not found.');
  }

  const metadata = parseFileMetadata(formData.get('metadata'));
  if (metadata.id !== fileId) {
    throw new ApiError(400, 'File route id does not match metadata id.');
  }

  const timestamp = nowIso();
  const uploadIdValue = formData.get('uploadId');
  const requestedObjectId =
    typeof uploadIdValue === 'string' ? sanitizeObjectId(uploadIdValue) : '';
  const objectId = requestedObjectId || crypto.randomUUID();
  const safeFileName = sanitizeFileName(metadata.name);
  const r2Key = `runs/${runId}/objects/${objectId}/${safeFileName}`;
  const thumbnailR2Key = thumbnailBlob
    ? `runs/${runId}/objects/${objectId}/thumbnail-${safeFileName}.webp`
    : null;

  await env.FILES.put(r2Key, fileValue.stream(), {
    httpMetadata: {
      contentType: fileValue.type || metadata.type || 'application/octet-stream',
    },
  });
  if (thumbnailBlob && thumbnailR2Key) {
    await env.FILES.put(thumbnailR2Key, thumbnailBlob.stream(), {
      httpMetadata: {
        contentType: thumbnailBlob.type || 'image/webp',
      },
    });
  }

  await env.DB.prepare(
    `INSERT INTO file_objects (
       id, run_id, project_id, file_id, r2_key, thumbnail_r2_key, name, size, type, sha256,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       run_id = excluded.run_id,
       project_id = excluded.project_id,
       file_id = excluded.file_id,
       r2_key = excluded.r2_key,
       thumbnail_r2_key = excluded.thumbnail_r2_key,
       name = excluded.name,
       size = excluded.size,
       type = excluded.type,
       sha256 = excluded.sha256`,
  )
    .bind(
      objectId,
      runId,
      run.project_id,
      metadata.id,
      r2Key,
      thumbnailR2Key,
      metadata.name,
      fileValue.size,
      fileValue.type || metadata.type || 'application/octet-stream',
      null,
      timestamp,
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO file_backups (
       id, run_id, project_id, object_id, r2_key, name, original_name, size, type, kind, added_at,
       review_state, review_notes, mapped_subject_id, asset_variant, source_file_id, metadata_json,
       explicitly_confirmed, image_width, image_height, thumbnail_r2_key, thumbnail_size,
       thumbnail_type, thumbnail_updated_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, id) DO UPDATE SET
       project_id = excluded.project_id,
       object_id = excluded.object_id,
       r2_key = excluded.r2_key,
       name = excluded.name,
       original_name = excluded.original_name,
       size = excluded.size,
       type = excluded.type,
       kind = excluded.kind,
       added_at = excluded.added_at,
       review_state = excluded.review_state,
       review_notes = excluded.review_notes,
       mapped_subject_id = excluded.mapped_subject_id,
       asset_variant = excluded.asset_variant,
       source_file_id = excluded.source_file_id,
       metadata_json = excluded.metadata_json,
       explicitly_confirmed = excluded.explicitly_confirmed,
       image_width = excluded.image_width,
       image_height = excluded.image_height,
       thumbnail_r2_key = excluded.thumbnail_r2_key,
       thumbnail_size = excluded.thumbnail_size,
       thumbnail_type = excluded.thumbnail_type,
       thumbnail_updated_at = excluded.thumbnail_updated_at,
       updated_at = excluded.updated_at`,
  )
    .bind(
      metadata.id,
      runId,
      run.project_id,
      objectId,
      r2Key,
      metadata.name,
      metadata.originalName,
      fileValue.size,
      fileValue.type || metadata.type || 'application/octet-stream',
      metadata.kind,
      metadata.addedAt,
      metadata.reviewState,
      metadata.reviewNotes,
      metadata.mappedSubjectId ?? null,
      metadata.assetVariant,
      metadata.sourceFileId ?? null,
      metadata.metadataJson ?? null,
      metadata.explicitlyConfirmed ? 1 : 0,
      metadata.imageMetadata?.width ?? null,
      metadata.imageMetadata?.height ?? null,
      thumbnailR2Key,
      thumbnailBlob?.size ?? null,
      thumbnailBlob?.type ?? null,
      thumbnailBlob ? timestamp : null,
      timestamp,
    )
    .run();

  await env.DB.prepare('UPDATE project_runs SET updated_at = ? WHERE id = ?')
    .bind(timestamp, runId)
    .run();
};

export const getRunFile = async (
  env: Env,
  runId: string,
  fileId: string,
): Promise<{ object: R2ObjectBody; row: Pick<FileRow, 'name' | 'type' | 'size'> }> => {
  const row = await env.DB.prepare(
    'SELECT r2_key, type, name, size FROM file_backups WHERE run_id = ? AND id = ?',
  )
    .bind(runId, fileId)
    .first<Pick<FileRow, 'r2_key' | 'type' | 'name' | 'size'>>();

  if (!row) {
    throw new ApiError(404, 'File metadata was not found.');
  }

  const object = await env.FILES.get(row.r2_key);
  if (!object) {
    throw new ApiError(404, 'File object was not found.');
  }

  return { object, row };
};

export const getRunFileThumbnail = async (
  env: Env,
  runId: string,
  fileId: string,
): Promise<{
  object: R2ObjectBody;
  row: { name: string; type: string; size: number };
}> => {
  const row = await env.DB.prepare(
    'SELECT thumbnail_r2_key, thumbnail_type, thumbnail_size, name FROM file_backups WHERE run_id = ? AND id = ?',
  )
    .bind(runId, fileId)
    .first<Pick<FileRow, 'thumbnail_r2_key' | 'thumbnail_type' | 'thumbnail_size' | 'name'>>();

  if (!row?.thumbnail_r2_key || row.thumbnail_size === null) {
    throw new ApiError(404, 'File thumbnail was not found.');
  }

  const object = await env.FILES.get(row.thumbnail_r2_key);
  if (!object) {
    throw new ApiError(404, 'File thumbnail object was not found.');
  }

  return {
    object,
    row: {
      name: row.name,
      type: row.thumbnail_type ?? 'image/webp',
      size: row.thumbnail_size,
    },
  };
};

export const isFileObjectReferenced = async (env: Env, objectId: string): Promise<boolean> => {
  const currentReference = await env.DB.prepare(
    'SELECT object_id FROM file_backups WHERE object_id = ? LIMIT 1',
  )
    .bind(objectId)
    .first<Pick<FileRow, 'object_id'>>();
  if (currentReference) {
    return true;
  }

  const revisionReference = await env.DB.prepare(
    'SELECT object_id FROM run_revision_files WHERE object_id = ? LIMIT 1',
  )
    .bind(objectId)
    .first<{ object_id: string }>();

  return Boolean(revisionReference);
};

const deleteFileObjectIfUnreferenced = async (env: Env, objectId: string | null): Promise<void> => {
  if (!objectId || (await isFileObjectReferenced(env, objectId))) {
    return;
  }

  const objectRow = await env.DB.prepare(
    'SELECT r2_key, thumbnail_r2_key FROM file_objects WHERE id = ?',
  )
    .bind(objectId)
    .first<Pick<FileObjectRow, 'r2_key' | 'thumbnail_r2_key'>>();
  if (!objectRow) {
    return;
  }

  await deleteR2Keys(
    env,
    [objectRow.r2_key, objectRow.thumbnail_r2_key].filter(Boolean) as string[],
  );
  await env.DB.prepare('DELETE FROM file_objects WHERE id = ?').bind(objectId).run();
};

export const deleteRunFile = async (env: Env, runId: string, fileId: string): Promise<void> => {
  const row = await env.DB.prepare(
    'SELECT object_id, r2_key, thumbnail_r2_key FROM file_backups WHERE run_id = ? AND id = ?',
  )
    .bind(runId, fileId)
    .first<Pick<FileRow, 'object_id' | 'r2_key' | 'thumbnail_r2_key'>>();

  if (!row) {
    return;
  }

  await env.DB.prepare('DELETE FROM file_backups WHERE run_id = ? AND id = ?')
    .bind(runId, fileId)
    .run();
  if (row.object_id) {
    await deleteFileObjectIfUnreferenced(env, row.object_id);
  } else {
    const revision = await env.DB.prepare('SELECT id FROM run_revisions WHERE run_id = ? LIMIT 1')
      .bind(runId)
      .first<Pick<RunRevisionRow, 'id'>>();
    if (!revision) {
      await deleteR2Keys(env, [row.r2_key, row.thumbnail_r2_key].filter(Boolean) as string[]);
    }
  }
  await env.DB.prepare('UPDATE project_runs SET updated_at = ? WHERE id = ?')
    .bind(nowIso(), runId)
    .run();
};

export const deleteRun = async (env: Env, runId: string): Promise<void> => {
  const fileRows = await env.DB.prepare(
    'SELECT r2_key, thumbnail_r2_key FROM file_backups WHERE run_id = ?',
  )
    .bind(runId)
    .all<Pick<FileRow, 'r2_key' | 'thumbnail_r2_key'>>();
  await deleteR2Keys(
    env,
    (fileRows.results ?? []).flatMap((row) =>
      [row.r2_key, row.thumbnail_r2_key].filter(Boolean),
    ) as string[],
  );
  const objectRows = await env.DB.prepare(
    'SELECT r2_key, thumbnail_r2_key FROM file_objects WHERE run_id = ?',
  )
    .bind(runId)
    .all<Pick<FileObjectRow, 'r2_key' | 'thumbnail_r2_key'>>();
  await deleteR2Keys(
    env,
    (objectRows.results ?? []).flatMap((row) =>
      [row.r2_key, row.thumbnail_r2_key].filter(Boolean),
    ) as string[],
  );
  await env.DB.prepare('DELETE FROM run_revision_files WHERE run_id = ?').bind(runId).run();
  await env.DB.prepare('DELETE FROM run_revisions WHERE run_id = ?').bind(runId).run();
  await env.DB.prepare('DELETE FROM file_objects WHERE run_id = ?').bind(runId).run();
  await env.DB.prepare('DELETE FROM file_backups WHERE run_id = ?').bind(runId).run();
  await env.DB.prepare('DELETE FROM project_runs WHERE id = ?').bind(runId).run();
  await insertEvent(env, 'run-deleted', `Deleted run ${runId}.`);
};

export const deleteAllRuns = async (env: Env): Promise<void> => {
  const fileRows = await env.DB.prepare('SELECT r2_key, thumbnail_r2_key FROM file_backups').all<
    Pick<FileRow, 'r2_key' | 'thumbnail_r2_key'>
  >();
  await deleteR2Keys(
    env,
    (fileRows.results ?? []).flatMap((row) =>
      [row.r2_key, row.thumbnail_r2_key].filter(Boolean),
    ) as string[],
  );
  const objectRows = await env.DB.prepare('SELECT r2_key, thumbnail_r2_key FROM file_objects').all<
    Pick<FileObjectRow, 'r2_key' | 'thumbnail_r2_key'>
  >();
  await deleteR2Keys(
    env,
    (objectRows.results ?? []).flatMap((row) =>
      [row.r2_key, row.thumbnail_r2_key].filter(Boolean),
    ) as string[],
  );
  await env.DB.prepare('DELETE FROM run_revision_files').run();
  await env.DB.prepare('DELETE FROM run_revisions').run();
  await env.DB.prepare('DELETE FROM file_objects').run();
  await env.DB.prepare('DELETE FROM file_backups').run();
  await env.DB.prepare('DELETE FROM project_runs').run();
  await env.DB.prepare('DELETE FROM backend_events').run();
};
