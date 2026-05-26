export type Marketplace = 'Etsy' | 'Other';

export type FileReviewState = 'pending' | 'approved' | 'rejected';

export type ManagedFileKind = 'uploaded' | 'generated-pdf' | 'generated-preview';

export type FileAssetVariant = 'color' | 'coloring-page';

export type MaskScale = 'small' | 'medium' | 'large';

export type QAGroup = 'critical' | 'warning' | 'informational';

export type QACheckStatus = 'pass' | 'fail' | 'info';

export type ActivityLevel = 'info' | 'success' | 'warning' | 'error';

export type ActivityType =
  | 'file-added'
  | 'file-removed'
  | 'image-generated'
  | 'image-approved'
  | 'image-mapped'
  | 'prompt-copied'
  | 'pdf-generated'
  | 'preview-generated'
  | 'project-imported'
  | 'project-exported'
  | 'archive-exported'
  | 'cloud-synced'
  | 'error';

export type AddActivity = (type: ActivityType, level: ActivityLevel, message: string) => void;

export type BusyAction =
  | 'brief-generation'
  | 'ai-analysis'
  | 'image-generation'
  | 'archive'
  | 'backend-sync'
  | 'project-json'
  | 'import'
  | null;

export type BusyActionName = Exclude<BusyAction, null>;

export type BusyActionContext = {
  signal: AbortSignal;
  setProgress: (message: string | null) => void;
};

export type RunBusyAction = <Result>(
  action: BusyActionName,
  task: (context: BusyActionContext) => Result | Promise<Result>,
) => Promise<Result>;

export type ImageMetadata = {
  width: number;
  height: number;
};

export type ProjectSettings = {
  title: string;
  theme: string;
  audience: string;
  marketplace: Marketplace;
  style: string;
  description: string;
  tags: string;
  safetyNote: string;
  printingInstructions: string;
  license: string;
  refundPolicy: string;
};

export type SubjectItem = {
  id: string;
  name: string;
};

export type PdfSettings = {
  generateA4: boolean;
  generateUSLetter: boolean;
  maskScale: MaskScale;
  showSubjectLabel: boolean;
  showInstructionFooter: boolean;
  pageMarginMm: number;
  includeCalibrationPage: boolean;
};

export type Project = {
  id: string;
  settings: ProjectSettings;
  subjects: SubjectItem[];
  pdfSettings: PdfSettings;
  openAIImageSettings: OpenAIImageSettings;
  createdAt: string;
  updatedAt: string;
  lastProjectJsonExportAt?: string;
  lastArchiveExportAt?: string;
  lastPdfGeneratedAt?: string;
  lastPreviewGeneratedAt?: string;
  lastImageApprovalAt?: string;
  lastBriefUpdatedAt?: string;
  lastEtsySeoGeneratedAt?: string;
  etsySeoAnalysis?: EtsySeoAnalysis;
  nestedEtsyUploadZipSizeBytes?: number;
};

export type ProjectDraft = {
  settings: ProjectSettings;
  subjects: SubjectItem[];
  etsySeoAnalysis?: EtsySeoAnalysis;
};

export type ManagedFile = {
  id: string;
  file: File;
  name: string;
  originalName: string;
  size: number;
  type: string;
  addedAt: string;
  kind: ManagedFileKind;
  objectUrl?: string;
  imageMetadata?: ImageMetadata;
  reviewState: FileReviewState;
  reviewNotes: string;
  mappedSubjectId?: string;
  assetVariant: FileAssetVariant;
  sourceFileId?: string;
  explicitlyConfirmed: boolean;
};

export type PromptItem = {
  subjectId: string;
  subjectName: string;
  expectedFilename: string;
  prompt: string;
  negativeRequirements: string;
};

export type QACheck = {
  id: string;
  group: QAGroup;
  label: string;
  status: QACheckStatus;
  details: string;
};

export type QAResult = {
  readinessPercentage: number;
  status: 'etsy-ready' | 'needs-review';
  checks: QACheck[];
  criticalPassed: boolean;
};

export type EtsySeoCheck = {
  id: string;
  group?: QAGroup;
  label: string;
  passed: boolean;
  details: string;
};

export type EtsySeoAnalysis = {
  titleWordCount: number;
  firstTitleSegment: string;
  tags: string[];
  repeatedTitleWords: string[];
  suggestedTitle: string;
  suggestedTags: string[];
  suggestedDescription: string;
  checks: EtsySeoCheck[];
};

export type ActivityItem = {
  id: string;
  type: ActivityType;
  level: ActivityLevel;
  message: string;
  createdAt: string;
};

export type FileExportGroups = {
  approvedMapped: ManagedFile[];
  approvedColoringPages: ManagedFile[];
  rejected: ManagedFile[];
  unused: ManagedFile[];
};

export type ExportManifest = {
  generatedAt: string;
  appVersion: string;
  marketplace: Marketplace;
  theme: string;
  title: string;
  maskCount: number;
  subjects: string[];
  expectedFilenames: string[];
  expectedColoringPageFilenames: string[];
  approvedImages: string[];
  approvedColoringPages: string[];
  rejectedImages: string[];
  unusedImages: string[];
  mappedImages: Record<string, string>;
  mappedColoringPages: Record<string, string>;
  imageDimensions: Record<string, ImageMetadata>;
  pdfFiles: string[];
  marketplacePreviewFiles: string[];
  sourceFileCount: number;
  sourceTotalSizeBytes: number;
  nestedEtsyUploadZipSizeBytes?: number;
  qaStatus: QAResult['status'];
  qaChecks: QACheck[];
  pdfSettings: PdfSettings;
};

export type OpenAIImageModel = 'gpt-image-1.5' | 'gpt-image-1' | 'gpt-image-1-mini' | 'gpt-image-2';

export type OpenAIImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';

export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto';

export type OpenAIImageBackground = 'transparent' | 'opaque' | 'auto';

export type OpenAIImageOutputFormat = 'png' | 'webp' | 'jpeg';

export type OpenAIImageSettings = {
  model: OpenAIImageModel;
  size: OpenAIImageSize;
  quality: OpenAIImageQuality;
  background: OpenAIImageBackground;
  outputFormat: OpenAIImageOutputFormat;
};

export type BrowserSupportResult = {
  supported: boolean;
  missingFeatures: string[];
};

export type ProjectJsonBackup = {
  appVersion: string;
  exportedAt: string;
  project: Project;
};

export type BackendHealth = {
  ok: boolean;
  version: string;
  storage: {
    d1: boolean;
    r2: boolean;
  };
  auth: {
    mode: 'access' | 'none';
    configured: boolean;
  };
  openaiProxyReady: boolean;
  maxFileBytes: number;
};

export type BackendRunStatus = 'draft';

export type BackendAutosaveStatus = 'idle' | 'restoring' | 'saving' | 'saved' | 'error';

export type BackendAutosaveState = {
  activeRunId: string;
  status: BackendAutosaveStatus;
  lastSavedAt?: string;
  lastError?: string;
};

export type BackendFileRecord = {
  id: string;
  runId: string;
  projectId: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  kind: ManagedFileKind;
  addedAt: string;
  reviewState: FileReviewState;
  reviewNotes: string;
  mappedSubjectId?: string;
  assetVariant?: FileAssetVariant;
  sourceFileId?: string;
  explicitlyConfirmed: boolean;
  imageMetadata?: ImageMetadata;
  thumbnail?: {
    size: number;
    type: string;
    updatedAt: string;
  };
  updatedAt: string;
};

export type BackendRestoreProgress = {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  downloadedBytes: number;
  totalBytes: number;
  currentFileName: string;
  phase: 'metadata' | 'files' | 'complete' | 'failed';
};

export type BackendRestoreTiming = {
  fileId: string;
  name: string;
  bytes: number;
  durationMs: number;
  blobConstructionMs: number;
};

export type BackendRestoreResult = {
  files: ManagedFile[];
  failedFiles: Array<{ file: BackendFileRecord; message: string }>;
  timings: BackendRestoreTiming[];
  cancelled: boolean;
};

export type BackendEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export type BackendProjectSnapshot = {
  runId?: string;
  idea?: string;
  status?: BackendRunStatus;
  project: Project | null;
  updatedAt?: string;
  files: BackendFileRecord[];
  events: BackendEvent[];
};

export type BackendRunSummary = {
  id: string;
  projectId: string;
  idea: string;
  status: BackendRunStatus;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  totalSizeBytes: number;
};

export type BackendImageResponse = {
  fileName: string;
  mimeType: string;
  base64: string;
};
