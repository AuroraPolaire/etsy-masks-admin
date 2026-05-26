ALTER TABLE file_backups ADD COLUMN asset_variant TEXT NOT NULL DEFAULT 'color';
ALTER TABLE file_backups ADD COLUMN source_file_id TEXT;

CREATE INDEX IF NOT EXISTS file_backups_asset_variant_idx
ON file_backups(run_id, asset_variant);
