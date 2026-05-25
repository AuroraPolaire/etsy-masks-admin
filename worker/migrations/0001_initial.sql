CREATE TABLE IF NOT EXISTS project_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  idea TEXT NOT NULL,
  project_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_backups (
  id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  kind TEXT NOT NULL,
  added_at TEXT NOT NULL,
  review_state TEXT NOT NULL,
  review_notes TEXT NOT NULL,
  mapped_subject_id TEXT,
  explicitly_confirmed INTEGER NOT NULL DEFAULT 0,
  image_width INTEGER,
  image_height INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (run_id, id),
  FOREIGN KEY (run_id) REFERENCES project_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS project_runs_idea_idx ON project_runs(idea);
CREATE INDEX IF NOT EXISTS project_runs_updated_at_idx ON project_runs(updated_at);
CREATE INDEX IF NOT EXISTS file_backups_run_id_idx ON file_backups(run_id);

CREATE TABLE IF NOT EXISTS backend_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS backend_events_created_at_idx ON backend_events(created_at);
