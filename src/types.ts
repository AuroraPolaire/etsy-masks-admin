export type Marketplace = 'Etsy' | 'Other';

export type FileReviewState = 'pending' | 'approved' | 'rejected';

export type ManagedFileKind = 'uploaded' | 'generated-pdf' | 'generated-preview';

export type MaskScale = 'small' | 'medium' | 'large';

export type QAGroup = 'critical' | 'warning' | 'informational';

export type QACheckStatus = 'pass' | 'fail' | 'info';

export type ActivityLevel = 'info' | 'success' | 'warning' | 'error';

export type ActivityType =
  | 'file-added'
  | 'file-removed'
  | 'image-generated'
  | 'image-approved'
  | 'image-rejected'
  | 'image-mapped'
  | 'notes-updated'
  | 'pdf-generated'
  | 'preview-generated'
  | 'project-imported'
  | 'project-exported'
  | 'archive-exported'
  | 'error';

export type AddActivity = (type: ActivityType, level: ActivityLevel, message: string) => void;

export type BusyAction =
  | 'uploading'
  | 'brief-generation'
  | 'image-generation'
  | 'pdfs'
  | 'previews'
  | 'archive'
  | 'project-json'
  | 'import'
  | null;

export type BusyActionName = Exclude<BusyAction, null>;

export type RunBusyAction = <Result>(
  action: BusyActionName,
  task: () => Result | Promise<Result>,
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
  createdAt: string;
  updatedAt: string;
  lastProjectJsonExportAt?: string;
  lastArchiveExportAt?: string;
  lastPdfGeneratedAt?: string;
  lastPreviewGeneratedAt?: string;
  lastImageApprovalAt?: string;
  nestedEtsyUploadZipSizeBytes?: number;
};

export type ProjectDraft = {
  settings: ProjectSettings;
  subjects: SubjectItem[];
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
  approvedImages: string[];
  rejectedImages: string[];
  unusedImages: string[];
  mappedImages: Record<string, string>;
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
  apiKey: string;
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
