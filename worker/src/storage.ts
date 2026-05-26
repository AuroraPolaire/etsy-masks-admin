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
  FileMetadataInput,
  FileRow,
  ProjectRunRow,
  ProjectRunStatus,
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

export type CreateRunInput = {
  idea: string;
  project: Record<string, unknown>;
};

export type UpdateRunInput = CreateRunInput;

const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';

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
    ...(row.mapped_subject_id ? { mappedSubjectId: row.mapped_subject_id } : {}),
    ...(row.source_file_id ? { sourceFileId: row.source_file_id } : {}),
    ...(imageMetadata ? { imageMetadata } : {}),
  };
};

const eventRowToRecord = (row: BackendEventRow): Record<string, string> => ({
  id: row.id,
  type: row.type,
  message: row.message,
  createdAt: row.created_at,
});

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

export const createRun = async (env: Env, input: CreateRunInput): Promise<RunSummary> => {
  const projectId = readRequiredString(input.project.id, 'project.id');
  const idea = input.idea.trim() || 'Untitled idea';
  const status: ProjectRunStatus = 'draft';
  const timestamp = nowIso();
  const runId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO project_runs (
       id, project_id, idea, project_json, status, created_at, updated_at, finalized_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(runId, projectId, idea, JSON.stringify(input.project), status, timestamp, timestamp, null)
    .run();
  await insertEvent(env, 'run-created', `Saved draft run "${idea}" to D1.`);

  return {
    id: runId,
    projectId,
    idea,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
    fileCount: 0,
    totalSizeBytes: 0,
  };
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
  if (assetVariant !== 'color' && assetVariant !== 'coloring-page') {
    throw new ApiError(400, 'metadata.assetVariant is invalid.');
  }
  const sourceFileId = readOptionalString(parsed.sourceFileId);

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
  const r2Key = `${runId}/${metadata.id}/${sanitizeFileName(metadata.name)}`;

  await env.FILES.put(r2Key, fileValue.stream(), {
    httpMetadata: {
      contentType: fileValue.type || metadata.type || 'application/octet-stream',
    },
  });

  await env.DB.prepare(
    `INSERT INTO file_backups (
       id, run_id, project_id, r2_key, name, original_name, size, type, kind, added_at,
       review_state, review_notes, mapped_subject_id, asset_variant, source_file_id,
       explicitly_confirmed, image_width, image_height, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, id) DO UPDATE SET
       project_id = excluded.project_id,
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
       explicitly_confirmed = excluded.explicitly_confirmed,
       image_width = excluded.image_width,
       image_height = excluded.image_height,
       updated_at = excluded.updated_at`,
  )
    .bind(
      metadata.id,
      runId,
      run.project_id,
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
      metadata.explicitlyConfirmed ? 1 : 0,
      metadata.imageMetadata?.width ?? null,
      metadata.imageMetadata?.height ?? null,
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
): Promise<{ object: R2ObjectBody; row: Pick<FileRow, 'name' | 'type'> }> => {
  const row = await env.DB.prepare(
    'SELECT r2_key, type, name FROM file_backups WHERE run_id = ? AND id = ?',
  )
    .bind(runId, fileId)
    .first<Pick<FileRow, 'r2_key' | 'type' | 'name'>>();

  if (!row) {
    throw new ApiError(404, 'File metadata was not found.');
  }

  const object = await env.FILES.get(row.r2_key);
  if (!object) {
    throw new ApiError(404, 'File object was not found.');
  }

  return { object, row };
};

export const deleteRunFile = async (env: Env, runId: string, fileId: string): Promise<void> => {
  const row = await env.DB.prepare('SELECT r2_key FROM file_backups WHERE run_id = ? AND id = ?')
    .bind(runId, fileId)
    .first<Pick<FileRow, 'r2_key'>>();

  if (!row) {
    return;
  }

  await deleteR2Keys(env, [row.r2_key]);
  await env.DB.prepare('DELETE FROM file_backups WHERE run_id = ? AND id = ?')
    .bind(runId, fileId)
    .run();
  await env.DB.prepare('UPDATE project_runs SET updated_at = ? WHERE id = ?')
    .bind(nowIso(), runId)
    .run();
};

export const deleteRun = async (env: Env, runId: string): Promise<void> => {
  const fileRows = await env.DB.prepare('SELECT r2_key FROM file_backups WHERE run_id = ?')
    .bind(runId)
    .all<Pick<FileRow, 'r2_key'>>();
  await deleteR2Keys(
    env,
    (fileRows.results ?? []).map((row) => row.r2_key),
  );
  await env.DB.prepare('DELETE FROM file_backups WHERE run_id = ?').bind(runId).run();
  await env.DB.prepare('DELETE FROM project_runs WHERE id = ?').bind(runId).run();
  await insertEvent(env, 'run-deleted', `Deleted run ${runId}.`);
};

export const deleteAllRuns = async (env: Env): Promise<void> => {
  const fileRows = await env.DB.prepare('SELECT r2_key FROM file_backups').all<
    Pick<FileRow, 'r2_key'>
  >();
  await deleteR2Keys(
    env,
    (fileRows.results ?? []).map((row) => row.r2_key),
  );
  await env.DB.prepare('DELETE FROM file_backups').run();
  await env.DB.prepare('DELETE FROM project_runs').run();
  await env.DB.prepare('DELETE FROM backend_events').run();
};
