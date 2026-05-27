CREATE TABLE IF NOT EXISTS file_objects (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  thumbnail_r2_key TEXT,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  sha256 TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES project_runs(id) ON DELETE CASCADE
);

ALTER TABLE file_backups ADD COLUMN object_id TEXT;

CREATE INDEX IF NOT EXISTS file_objects_run_file_idx ON file_objects(run_id, file_id);
CREATE INDEX IF NOT EXISTS file_objects_run_id_idx ON file_objects(run_id);

CREATE TABLE IF NOT EXISTS run_revisions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  parent_revision_id TEXT,
  sequence_number INTEGER NOT NULL,
  stage TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  project_json TEXT NOT NULL,
  file_manifest_json TEXT NOT NULL,
  change_summary_json TEXT,
  thumbnail_file_id TEXT,
  file_count INTEGER NOT NULL DEFAULT 0,
  total_size_bytes INTEGER NOT NULL DEFAULT 0,
  is_manual INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  restored_from_revision_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES project_runs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS run_revisions_run_sequence_idx
  ON run_revisions(run_id, sequence_number);

CREATE INDEX IF NOT EXISTS run_revisions_run_created_at_idx
  ON run_revisions(run_id, created_at DESC);

CREATE TABLE IF NOT EXISTS run_revision_files (
  revision_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  object_id TEXT,
  PRIMARY KEY (revision_id, file_id),
  FOREIGN KEY (revision_id) REFERENCES run_revisions(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES project_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS run_revision_files_object_id_idx
  ON run_revision_files(object_id);

CREATE INDEX IF NOT EXISTS run_revision_files_run_id_idx
  ON run_revision_files(run_id);

INSERT OR IGNORE INTO file_objects (
  id,
  run_id,
  project_id,
  file_id,
  r2_key,
  thumbnail_r2_key,
  name,
  size,
  type,
  sha256,
  created_at
)
SELECT
  'legacy-' || run_id || '-' || id,
  run_id,
  project_id,
  id,
  r2_key,
  thumbnail_r2_key,
  name,
  size,
  type,
  NULL,
  updated_at
FROM file_backups
WHERE object_id IS NULL;

UPDATE file_backups
SET object_id = 'legacy-' || run_id || '-' || id
WHERE object_id IS NULL;
