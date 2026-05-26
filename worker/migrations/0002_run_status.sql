ALTER TABLE project_runs ADD COLUMN status TEXT NOT NULL DEFAULT 'final';
ALTER TABLE project_runs ADD COLUMN finalized_at TEXT;

UPDATE project_runs
SET status = 'final',
    finalized_at = COALESCE(finalized_at, updated_at)
WHERE status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS project_runs_status_idx ON project_runs(status);
