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
