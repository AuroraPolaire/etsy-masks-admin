import { ArchiveActions } from './ArchiveActions';
import { BrowserSupportWarning } from './BrowserSupportWarning';
import { EtsySeoPanel } from './EtsySeoPanel';
import { FileUploader } from './FileUploader';
import { InitialPromptPanel } from './InitialPromptPanel';
import { PrivacyNotice } from './PrivacyNotice';
import { ProductBriefForm } from './ProductBriefForm';
import { PromptManager } from './PromptManager';
import { QAPanel } from './QAPanel';
import { TopicSetupPanel } from './TopicSetupPanel';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Stepper } from './ui/Stepper';
import { StepAdvanceButton, StepSection } from './ui/StepSection';

import type {
  BrowserSupportResult,
  BusyAction,
  ManagedFile,
  Project,
  ProjectSettings,
  PromptItem,
  QAResult,
} from '../types';
import type { WorkflowState, WorkflowStepId } from '../workflow/workflowState';

type HomeWorkflowViewProps = {
  browserSupport: BrowserSupportResult;
  workflow: WorkflowState;
  project: Project;
  prompts: PromptItem[];
  files: ManagedFile[];
  qaResult: QAResult;
  hasAIProvider: boolean;
  busyAction: BusyAction;
  generatingSubjectIds: string[];
  generatingColoringPageSubjectIds: string[];
  missingImageCount: number;
  missingColoringPageCount: number;
  imageGenerationHint: string;
  onStepSelected: (stepId: WorkflowStepId) => void;
  onOpenCloudSaves: () => void;
  onFillProductBrief: (initialPrompt: string) => void;
  onUpdateSettings: (settings: ProjectSettings) => void;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onGenerateMissingImages: () => void;
  onGenerateColoringPage: (subjectId: string) => void;
  onGenerateMissingColoringPages: () => void;
  onApproveAllFiles: (fileIds: string[]) => void;
  onApproveFile: (fileId: string) => void;
  onRejectFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onCopyPrompt: (message: string) => void;
  onFilesSelected: (files: File[]) => void;
  onExportArchive: () => void;
  onExportProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
};

export const HomeWorkflowView = ({
  browserSupport,
  workflow,
  project,
  prompts,
  files,
  qaResult,
  hasAIProvider,
  busyAction,
  generatingSubjectIds,
  generatingColoringPageSubjectIds,
  missingImageCount,
  missingColoringPageCount,
  imageGenerationHint,
  onStepSelected,
  onOpenCloudSaves,
  onFillProductBrief,
  onUpdateSettings,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onGenerateMissingImages,
  onGenerateColoringPage,
  onGenerateMissingColoringPages,
  onApproveAllFiles,
  onApproveFile,
  onRejectFile,
  onDeleteFile,
  onNotesChange,
  onCopyPrompt,
  onFilesSelected,
  onExportArchive,
  onExportProjectJson,
  onImportProjectJson,
}: HomeWorkflowViewProps) => (
  <>
    <BrowserSupportWarning result={browserSupport} />
    <PrivacyNotice />
    <Alert>
      Listing copy, settings, and files autosave to the backend when Cloudflare is reachable.
      Reloading the app restores the active backend draft automatically.
    </Alert>
    <Stepper steps={workflow.stepperItems} />
    {workflow.steps.map((step, index) => (
      <StepSection
        key={step.id}
        number={index + 1}
        title={step.title}
        description={step.description}
        state={workflow.getStepState(step.id)}
        summary={step.summary}
        lockedReason={step.lockedReason}
        onActivate={() => onStepSelected(step.id)}
      >
        {step.id === 'brief' ? (
          <div className="space-y-6">
            <InitialPromptPanel
              aiReady={hasAIProvider}
              disabled={busyAction !== null}
              isGenerating={busyAction === 'brief-generation'}
              onFillBrief={onFillProductBrief}
            />
            <ProductBriefForm
              settings={project.settings}
              lastSavedAt={project.updatedAt}
              onChange={onUpdateSettings}
            />
            <EtsySeoPanel project={project} onChange={onUpdateSettings} />
            <StepAdvanceButton
              disabled={!workflow.briefComplete}
              onClick={() => onStepSelected('topics')}
            >
              Next: topics
            </StepAdvanceButton>
          </div>
        ) : null}
        {step.id === 'topics' ? (
          <div className="space-y-6">
            <TopicSetupPanel
              subjects={project.subjects}
              onAddSubject={onAddSubject}
              onRemoveSubject={onRemoveSubject}
            />
            <StepAdvanceButton
              disabled={!workflow.topicsComplete}
              onClick={() => onStepSelected('images')}
            >
              Next: AI images
            </StepAdvanceButton>
          </div>
        ) : null}
        {step.id === 'images' ? (
          <div className="space-y-6">
            {!hasAIProvider ? (
              <Alert
                tone="info"
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  Configure the backend OpenAI proxy for AI generation, or upload files manually for
                  each topic.
                </span>
                <Button onClick={onOpenCloudSaves}>Open backend saves</Button>
              </Alert>
            ) : null}
            <PromptManager
              subjects={project.subjects}
              prompts={prompts}
              files={files}
              canGenerateImages={hasAIProvider && busyAction === null}
              generatingSubjectIds={generatingSubjectIds}
              generatingColoringPageSubjectIds={generatingColoringPageSubjectIds}
              missingImageCount={missingImageCount}
              missingColoringPageCount={missingColoringPageCount}
              imageGenerationHint={imageGenerationHint}
              allowTopicEditing={false}
              onAddSubject={onAddSubject}
              onRemoveSubject={onRemoveSubject}
              onGenerateImage={onGenerateImage}
              onGenerateMissingImages={onGenerateMissingImages}
              onGenerateColoringPage={onGenerateColoringPage}
              onGenerateMissingColoringPages={onGenerateMissingColoringPages}
              onApproveAll={onApproveAllFiles}
              onApprove={onApproveFile}
              onReject={onRejectFile}
              onDelete={onDeleteFile}
              onNotesChange={onNotesChange}
              onCopy={onCopyPrompt}
            />
            <FileUploader onFilesSelected={onFilesSelected} disabled={busyAction !== null} />
            <StepAdvanceButton
              disabled={!workflow.imagesComplete}
              onClick={() => onStepSelected('export')}
            >
              Next: QA and export
            </StepAdvanceButton>
          </div>
        ) : null}
        {step.id === 'export' ? (
          <div className="space-y-6">
            <QAPanel result={qaResult} />
            <ArchiveActions
              qaResult={qaResult}
              busyAction={busyAction}
              canExportFinalFiles={workflow.canExportFinalFiles}
              onExportArchive={onExportArchive}
              onExportProjectJson={onExportProjectJson}
              onImportProjectJson={onImportProjectJson}
            />
          </div>
        ) : null}
      </StepSection>
    ))}
  </>
);
