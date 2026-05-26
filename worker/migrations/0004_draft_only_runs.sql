UPDATE project_runs
SET status = 'draft',
    finalized_at = NULL
WHERE status <> 'draft' OR finalized_at IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS project_runs_force_draft_insert
AFTER INSERT ON project_runs
WHEN NEW.status <> 'draft' OR NEW.finalized_at IS NOT NULL
BEGIN
  UPDATE project_runs
  SET status = 'draft',
      finalized_at = NULL
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS project_runs_force_draft_update
AFTER UPDATE OF status, finalized_at ON project_runs
WHEN NEW.status <> 'draft' OR NEW.finalized_at IS NOT NULL
BEGIN
  UPDATE project_runs
  SET status = 'draft',
      finalized_at = NULL
  WHERE id = NEW.id;
END;
