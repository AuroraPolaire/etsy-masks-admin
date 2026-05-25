export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  ADMIN_TOKEN?: string;
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  MAX_FILE_BYTES?: string;
  APP_VERSION?: string;
};

export type ProjectRunRow = {
  id: string;
  project_id: string;
  idea: string;
  project_json: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  run_id: string;
  project_id: string;
  r2_key: string;
  name: string;
  original_name: string;
  size: number;
  type: string;
  kind: string;
  added_at: string;
  review_state: string;
  review_notes: string;
  mapped_subject_id: string | null;
  explicitly_confirmed: number;
  image_width: number | null;
  image_height: number | null;
  updated_at: string;
};

export type BackendEventRow = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

export type FileMetadataInput = {
  id: string;
  projectId: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  kind: string;
  addedAt: string;
  reviewState: string;
  reviewNotes: string;
  mappedSubjectId?: string;
  explicitlyConfirmed: boolean;
  imageMetadata?: {
    width: number;
    height: number;
  };
};
