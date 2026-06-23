import { ArchiveActions } from './ArchiveActions';
import { BrowserSupportWarning } from './BrowserSupportWarning';
import { EtsySeoPanel } from './EtsySeoPanel';
import { InitialPromptPanel } from './InitialPromptPanel';
import { MarketingAssetsPanel } from './MarketingAssetsPanel';
import { ProductBriefForm } from './ProductBriefForm';
import { PromptManager } from './PromptManager';
import { QAPanel } from './QAPanel';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { StepAdvanceButton, StepSection } from './ui/StepSection';

import type {
  BrowserSupportResult,
  BriefReferenceImage,
  BusyAction,
  ManagedFile,
  Project,
  ProjectSettings,
  MarketingSettings,
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
  queuedSubjectIds: string[];
  queuedColoringPageSubjectIds: string[];
  missingImageCount: number;
  missingColoringPageCount: number;
  imageGenerationHint: string;
  onStepSelected: (stepId: WorkflowStepId) => void;
  onOpenCloudSaves: () => void;
  onFillProductBrief: (initialPrompt: string, referenceImages: BriefReferenceImage[]) => void;
  onAnalyzeListingWithAI: () => void;
  onUpdateSettings: (settings: ProjectSettings) => void;
  onUpdateMarketingSettings: (settings: MarketingSettings) => void;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string, promptOverride?: string) => void;
  onGenerateMissingImages: () => void;
  onGenerateColoringPage: (subjectId: string) => void;
  onGenerateMissingColoringPages: () => void;
  onGenerateSloganPreviews: () => void;
  onGenerateMaskSheets: () => void;
  onGenerateChildrenScenePreviews: () => void;
  onDeleteFile: (fileId: string) => void;
  onCopyPrompt: (message: string) => void;
  onExportArchive: () => void;
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
  queuedSubjectIds,
  queuedColoringPageSubjectIds,
  missingImageCount,
  missingColoringPageCount,
  imageGenerationHint,
  onStepSelected,
  onOpenCloudSaves,
  onFillProductBrief,
  onAnalyzeListingWithAI,
  onUpdateSettings,
  onUpdateMarketingSettings,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onGenerateMissingImages,
  onGenerateColoringPage,
  onGenerateMissingColoringPages,
  onGenerateSloganPreviews,
  onGenerateMaskSheets,
  onGenerateChildrenScenePreviews,
  onDeleteFile,
  onCopyPrompt,
  onExportArchive,
}: HomeWorkflowViewProps) => {
  const showSeoPanel = Boolean(project.lastBriefUpdatedAt ?? project.etsySeoAnalysis);

  return (
    <>
      <BrowserSupportWarning result={browserSupport} />
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
                onOpenBackendSaves={onOpenCloudSaves}
              />
              <ProductBriefForm
                settings={project.settings}
                lastSavedAt={project.updatedAt}
                onChange={onUpdateSettings}
              />
              {showSeoPanel ? (
                <EtsySeoPanel
                  project={project}
                  canAnalyzeWithAI={hasAIProvider}
                  isAnalyzing={busyAction === 'ai-analysis'}
                  onAnalyzeWithAI={onAnalyzeListingWithAI}
                  onChange={onUpdateSettings}
                />
              ) : null}
              <StepAdvanceButton
                disabled={!workflow.briefComplete}
                onClick={() => onStepSelected('images')}
              >
                Next: topics and images
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
                  <span>Connect online AI before generating mask images.</span>
                  <Button onClick={onOpenCloudSaves}>Open saved work</Button>
                </Alert>
              ) : null}
              <PromptManager
                subjects={project.subjects}
                prompts={prompts}
                files={files}
                canGenerateImages={
                  hasAIProvider && (busyAction === null || busyAction === 'image-generation')
                }
                generatingSubjectIds={generatingSubjectIds}
                generatingColoringPageSubjectIds={generatingColoringPageSubjectIds}
                queuedSubjectIds={queuedSubjectIds}
                queuedColoringPageSubjectIds={queuedColoringPageSubjectIds}
                missingImageCount={missingImageCount}
                missingColoringPageCount={missingColoringPageCount}
                imageGenerationHint={imageGenerationHint}
                promptStyle={project.settings.style}
                onPromptStyleChange={(style) => onUpdateSettings({ ...project.settings, style })}
                onAddSubject={onAddSubject}
                onRemoveSubject={onRemoveSubject}
                onGenerateImage={onGenerateImage}
                onGenerateMissingImages={onGenerateMissingImages}
                onGenerateColoringPage={onGenerateColoringPage}
                onGenerateMissingColoringPages={onGenerateMissingColoringPages}
                onDelete={onDeleteFile}
                onCopy={onCopyPrompt}
              />
              <StepAdvanceButton
                disabled={!workflow.canExportFinalFiles}
                onClick={() => onStepSelected(workflow.marketingUnlocked ? 'marketing' : 'export')}
              >
                {workflow.marketingUnlocked ? 'Next: marketing assets' : 'Review partial export'}
              </StepAdvanceButton>
            </div>
          ) : null}
          {step.id === 'marketing' ? (
            <div className="space-y-6">
              <MarketingAssetsPanel
                project={project}
                files={files}
                hasAIProvider={hasAIProvider}
                busyAction={busyAction}
                onMarketingSettingsChange={onUpdateMarketingSettings}
                onGenerateSloganPreviews={onGenerateSloganPreviews}
                onGenerateMaskSheets={onGenerateMaskSheets}
                onGenerateChildrenScenePreviews={onGenerateChildrenScenePreviews}
                onDeleteFile={onDeleteFile}
              />
              <StepAdvanceButton
                disabled={!workflow.canExportFinalFiles}
                onClick={() => onStepSelected('export')}
              >
                Next: QA and export
              </StepAdvanceButton>
            </div>
          ) : null}
          {step.id === 'export' ? (
            <div className="space-y-6">
              <QAPanel
                result={qaResult}
                canAnalyzeWithAI={hasAIProvider}
                isAnalyzing={busyAction === 'ai-analysis'}
                onAnalyzeWithAI={onAnalyzeListingWithAI}
              />
              <ArchiveActions
                qaResult={qaResult}
                busyAction={busyAction}
                canExportFinalFiles={workflow.canExportFinalFiles}
                onExportArchive={onExportArchive}
              />
            </div>
          ) : null}
        </StepSection>
      ))}
    </>
  );
};
