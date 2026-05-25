import { useCallback, useMemo, useState } from 'react';

import { ActivityLog } from './components/ActivityLog';
import { AppSidebar } from './components/AppSidebar';
import { ArchiveActions } from './components/ArchiveActions';
import { BackendDataPanel } from './components/BackendDataPanel';
import { BrowserSupportWarning } from './components/BrowserSupportWarning';
import { EtsySeoPanel } from './components/EtsySeoPanel';
import { FileUploader } from './components/FileUploader';
import { Header } from './components/Header';
import { InitialPromptPanel } from './components/InitialPromptPanel';
import { OpenAIImagePanel } from './components/OpenAIImagePanel';
import { OutputActionsPanel } from './components/OutputActionsPanel';
import { PdfSettingsPanel } from './components/PdfSettingsPanel';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProductBriefForm } from './components/ProductBriefForm';
import { PromptManager } from './components/PromptManager';
import { QAPanel } from './components/QAPanel';
import { TopicSetupPanel } from './components/TopicSetupPanel';
import { Alert } from './components/ui/Alert';
import { Button } from './components/ui/Button';
import { Card, CardBody, CardHeader } from './components/ui/Card';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { Stepper } from './components/ui/Stepper';
import { StepAdvanceButton, StepSection } from './components/ui/StepSection';
import { useToast } from './components/ui/toastContext';
import { WorkflowStatus } from './components/WorkflowStatus';
import { useActivityLog } from './hooks/useActivityLog';
import { useBackendCache } from './hooks/useBackendCache';
import { useBusyAction } from './hooks/useBusyAction';
import { useExportActions } from './hooks/useExportActions';
import { useManagedFiles } from './hooks/useManagedFiles';
import { useOpenAIImageGeneration } from './hooks/useOpenAIImageGeneration';
import { useProjectState } from './hooks/useProjectState';
import { checkBrowserSupport } from './lib/browserSupport';
import { createPromptItems, getFileForSubject } from './lib/files';
import { runQA } from './lib/qa';
import { createWorkflowState } from './workflow/workflowState';

import type { AppSectionId } from './components/AppSidebar';
import type { ConfirmDialogRequest } from './components/ui/ConfirmDialog';
import type {
  ActivityLevel,
  ActivityType,
  OpenAIImageSettings,
  ProjectDraft,
  PromptItem,
} from './types';
import type { WorkflowStepId } from './workflow/workflowState';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const toastTitles: Record<ActivityLevel, string> = {
  info: 'Updated',
  success: 'Done',
  warning: 'Needs attention',
  error: 'Something went wrong',
};

export const App = () => {
  const browserSupport = useMemo(() => checkBrowserSupport(), []);
  const { showToast } = useToast();
  const { activityLog, addActivity: recordActivity } = useActivityLog();
  const addActivity = useCallback(
    (type: ActivityType, level: ActivityLevel, message: string) => {
      recordActivity(type, level, message);
      showToast({
        tone: level,
        title: toastTitles[level],
        message,
      });
    },
    [recordActivity, showToast],
  );
  const [activeStepId, setActiveStepId] = useState<WorkflowStepId>('brief');
  const [activeSectionId, setActiveSectionId] = useState<AppSectionId>('home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<
    (ConfirmDialogRequest & { resolve: (confirmed: boolean) => void }) | null
  >(null);
  const {
    project,
    updateProject,
    replaceProject,
    updateSettings,
    updatePdfSettings,
    applyInitialDraft,
    addSubject,
    removeSubject,
    markImageApproved,
  } = useProjectState();
  const {
    files,
    filesRef,
    appendFiles,
    uploadFiles,
    approveFile,
    rejectFile,
    deleteFile,
    updateNotes,
    confirmReview,
    clearAllMappings,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
    replaceGeneratedFilesByKind,
  } = useManagedFiles({
    subjects: project.subjects,
    addActivity,
    onImageApproved: markImageApproved,
  });
  const { busyAction, busyProgress, cancelBusyAction, runBusyAction } = useBusyAction();
  const requestConfirmation = useCallback((request: ConfirmDialogRequest) => {
    return new Promise<boolean>((resolve) => {
      setConfirmRequest({ ...request, resolve });
    });
  }, []);
  const prompts = useMemo(
    () => createPromptItems(project.subjects, project.settings),
    [project.settings, project.subjects],
  );
  const qaResult = useMemo(() => runQA(project, files), [project, files]);
  const missingImagePrompts = useMemo(
    () => prompts.filter((prompt) => !getFileForSubject(files, prompt.subjectId)),
    [files, prompts],
  );
  const backendCache = useBackendCache({
    project,
    files,
    replaceProject,
    replaceFiles,
    addActivity,
    runBusyAction,
    confirmAction: requestConfirmation,
  });
  const generateImageFile = useCallback(
    async (
      settings: OpenAIImageSettings,
      prompt: PromptItem,
      signal?: AbortSignal,
    ): Promise<File> => {
      if (!backendCache.canUseOpenAIProxy) {
        throw new Error('Backend OpenAI proxy is required before generating images.');
      }

      return backendCache.generateImage(settings, prompt, signal);
    },
    [backendCache],
  );
  const {
    openAISettings,
    setOpenAISettings,
    generatingSubjectId,
    generateSubjectImage,
    generateMissingSubjectImages,
  } = useOpenAIImageGeneration({
    subjects: project.subjects,
    prompts,
    missingImagePrompts,
    filesRef,
    appendFiles,
    addActivity,
    generateImageFile,
  });
  const hasAIProvider = backendCache.canUseOpenAIProxy;
  const workflow = useMemo(
    () =>
      createWorkflowState({
        project,
        files,
        qaResult,
        hasAIProvider,
        activeStepId,
      }),
    [activeStepId, files, hasAIProvider, project, qaResult],
  );
  const imageGenerationHint = !hasAIProvider
    ? 'Configure the Backend proxy to generate images.'
    : missingImagePrompts.length === 0
      ? 'All topics have approved images.'
      : `${missingImagePrompts.length} topic${missingImagePrompts.length === 1 ? '' : 's'} still need an approved image.`;
  const handleConfirmCancel = useCallback(() => {
    confirmRequest?.resolve(false);
    setConfirmRequest(null);
  }, [confirmRequest]);

  const handleConfirmAccept = useCallback(() => {
    confirmRequest?.resolve(true);
    setConfirmRequest(null);
  }, [confirmRequest]);

  const { generatePdfs, generatePreviews, exportProjectJson, importProjectJson, exportArchive } =
    useExportActions({
      project,
      files,
      updateProject,
      replaceProject,
      replaceGeneratedFilesByKind,
      clearFiles,
      addActivity,
      runBusyAction,
      confirmAction: requestConfirmation,
    });

  const applyDraftToProject = useCallback(
    async (draft: ProjectDraft, activityMessage: string) => {
      if (files.length > 0) {
        const shouldApply = await requestConfirmation({
          title: 'Replace current topics?',
          description:
            'A new brief replaces the topic list and clears assigned images. Uploaded files stay in this session.',
          confirmLabel: 'Replace topics',
        });
        if (!shouldApply) {
          return;
        }
      }

      applyInitialDraft(draft);
      clearAllMappings();
      addActivity('project-imported', 'success', activityMessage);
    },
    [addActivity, applyInitialDraft, clearAllMappings, files.length, requestConfirmation],
  );

  const handleFillProductBrief = useCallback(
    (initialPrompt: string) => {
      void runBusyAction('brief-generation', async ({ setProgress, signal }) => {
        setProgress('Drafting product brief...');

        if (!backendCache.canUseOpenAIProxy) {
          addActivity('error', 'error', 'Configure the backend OpenAI proxy before drafting.');
          return;
        }

        try {
          const draft = await backendCache.generateProjectDraft(initialPrompt, signal);
          if (signal.aborted) {
            return;
          }
          await applyDraftToProject(
            draft,
            `Drafted the brief through the backend proxy and added ${draft.subjects.length} topics.`,
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            addActivity('project-imported', 'warning', 'Brief generation was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not draft the brief through the backend proxy.'),
          );
        }
      });
    },
    [addActivity, applyDraftToProject, backendCache, runBusyAction],
  );

  const handleAddSubject = useCallback(
    (name: string) => {
      addSubject(name);
      addActivity('file-added', 'info', `Added ${name} to topics.`);
    },
    [addActivity, addSubject],
  );

  const handleRemoveSubject = useCallback(
    (subjectId: string) => {
      const subjectName =
        project.subjects.find((subject) => subject.id === subjectId)?.name ?? 'subject';
      void (async () => {
        const shouldRemove = await requestConfirmation({
          title: `Remove ${subjectName}?`,
          description:
            'This removes the topic and clears its assigned image. Uploaded files stay in this session.',
          confirmLabel: 'Remove topic',
          tone: 'danger',
        });

        if (!shouldRemove) {
          return;
        }

        removeSubject(subjectId);
        clearSubjectMapping(subjectId);
        addActivity(
          'file-removed',
          'warning',
          `Removed ${subjectName} and cleared its assigned image.`,
        );
      })();
    },
    [addActivity, clearSubjectMapping, project.subjects, removeSubject, requestConfirmation],
  );

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      const fileName = files.find((file) => file.id === fileId)?.name ?? 'this file';
      void (async () => {
        const shouldDelete = await requestConfirmation({
          title: `Delete ${fileName}?`,
          description:
            'This removes the file from this session. Upload or generate it again if you need it later.',
          confirmLabel: 'Delete file',
          tone: 'danger',
        });

        if (shouldDelete) {
          deleteFile(fileId);
        }
      })();
    },
    [deleteFile, files, requestConfirmation],
  );

  const handleClearFiles = useCallback(() => {
    void (async () => {
      const shouldClear = await requestConfirmation({
        title: 'Clear session files?',
        description:
          'This removes uploaded and generated files from this browser session. Project text stays saved.',
        confirmLabel: 'Clear files',
        tone: 'danger',
      });

      if (shouldClear) {
        clearFiles('Cleared session files.');
      }
    })();
  }, [clearFiles, requestConfirmation]);

  const handleFilesSelected = useCallback(
    (incomingFiles: File[]) => {
      void runBusyAction('uploading', () => uploadFiles(incomingFiles));
    },
    [runBusyAction, uploadFiles],
  );

  const handleGenerateSubjectImage = useCallback(
    (subjectId: string) => {
      void runBusyAction('image-generation', (context) => generateSubjectImage(subjectId, context));
    },
    [generateSubjectImage, runBusyAction],
  );

  const handleGenerateMissingSubjectImages = useCallback(() => {
    void runBusyAction('image-generation', generateMissingSubjectImages);
  }, [generateMissingSubjectImages, runBusyAction]);

  const renderOpenAIImagePanel = () => (
    <OpenAIImagePanel
      settings={openAISettings}
      missingImageCount={missingImagePrompts.length}
      subjectCount={project.subjects.length}
      backendOpenAIReady={backendCache.canUseOpenAIProxy}
      onChange={setOpenAISettings}
    />
  );

  const renderHomeView = () => (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
      <div className="min-w-0 space-y-6">
        <BrowserSupportWarning result={browserSupport} />
        <PrivacyNotice />
        <Alert>
          Listing copy is saved in this browser. Uploaded files clear on refresh, so export the ZIP
          or re-upload files before continuing later.
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
            onActivate={() => setActiveStepId(step.id)}
          >
            {step.id === 'brief' ? (
              <div className="space-y-6">
                <InitialPromptPanel
                  aiReady={hasAIProvider}
                  disabled={busyAction !== null}
                  isGenerating={busyAction === 'brief-generation'}
                  onFillBrief={handleFillProductBrief}
                />
                <ProductBriefForm
                  settings={project.settings}
                  lastSavedAt={project.updatedAt}
                  onChange={updateSettings}
                />
                <EtsySeoPanel project={project} onChange={updateSettings} />
                <StepAdvanceButton
                  disabled={!workflow.briefComplete}
                  onClick={() => setActiveStepId('topics')}
                >
                  Next: topics
                </StepAdvanceButton>
              </div>
            ) : null}
            {step.id === 'topics' ? (
              <div className="space-y-6">
                <TopicSetupPanel
                  subjects={project.subjects}
                  onAddSubject={handleAddSubject}
                  onRemoveSubject={handleRemoveSubject}
                />
                <StepAdvanceButton
                  disabled={!workflow.topicsComplete}
                  onClick={() => setActiveStepId('images')}
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
                      Configure the backend OpenAI proxy for AI generation, or upload files manually
                      for each topic.
                    </span>
                    <Button onClick={() => setActiveSectionId('backend')}>Open Backend</Button>
                  </Alert>
                ) : null}
                <PromptManager
                  subjects={project.subjects}
                  prompts={prompts}
                  files={files}
                  canGenerateImages={hasAIProvider && busyAction === null}
                  generatingSubjectId={generatingSubjectId}
                  missingImageCount={missingImagePrompts.length}
                  imageGenerationHint={imageGenerationHint}
                  allowTopicEditing={false}
                  onAddSubject={handleAddSubject}
                  onRemoveSubject={handleRemoveSubject}
                  onGenerateImage={handleGenerateSubjectImage}
                  onGenerateMissingImages={handleGenerateMissingSubjectImages}
                  onApprove={approveFile}
                  onReject={rejectFile}
                  onDelete={handleDeleteFile}
                  onNotesChange={updateNotes}
                  onConfirmReview={confirmReview}
                  onCopy={(message) => addActivity('notes-updated', 'success', message)}
                />
                <FileUploader
                  onFilesSelected={handleFilesSelected}
                  disabled={busyAction !== null}
                />
                <StepAdvanceButton
                  disabled={!workflow.imagesComplete}
                  onClick={() => setActiveStepId('outputs')}
                >
                  Next: PDFs and previews
                </StepAdvanceButton>
              </div>
            ) : null}
            {step.id === 'outputs' ? (
              <div className="space-y-6">
                <PdfSettingsPanel settings={project.pdfSettings} onChange={updatePdfSettings} />
                <OutputActionsPanel
                  busyAction={busyAction}
                  canGenerateOutputs={workflow.canGenerateOutputs}
                  pdfCount={workflow.pdfCount}
                  previewCount={workflow.previewCount}
                  onGeneratePdfs={generatePdfs}
                  onGeneratePreviews={generatePreviews}
                />
                <StepAdvanceButton
                  disabled={!workflow.outputsComplete}
                  onClick={() => setActiveStepId('export')}
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
                  canGenerateOutputs={workflow.canGenerateOutputs}
                  pdfCount={workflow.pdfCount}
                  previewCount={workflow.previewCount}
                  onGeneratePdfs={generatePdfs}
                  onGeneratePreviews={generatePreviews}
                  onExportArchive={exportArchive}
                  onExportProjectJson={exportProjectJson}
                  onImportProjectJson={importProjectJson}
                />
              </div>
            ) : null}
          </StepSection>
        ))}
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
        <WorkflowStatus
          workflow={workflow}
          qaResult={qaResult}
          busyAction={busyAction}
          busyProgress={busyProgress}
          onCancelBusyAction={cancelBusyAction}
        />
        <QAPanel result={qaResult} />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderSettingsView = () => (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Settings
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink-strong">Image generation settings</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Manage the model, image size, quality, background, output format, and cost estimate used
            by backend AI generation.
          </p>
        </div>
        {renderOpenAIImagePanel()}
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
        <WorkflowStatus
          workflow={workflow}
          qaResult={qaResult}
          busyAction={busyAction}
          busyProgress={busyProgress}
          onCancelBusyAction={cancelBusyAction}
        />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderBackendView = () => (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Backend
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink-strong">
            Cloud run cache and OpenAI proxy
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Manage the optional Cloudflare Worker, selectable saved runs, R2 file backups, and
            server-side OpenAI key handling.
          </p>
        </div>
        <BackendDataPanel
          health={backendCache.health}
          runs={backendCache.runs}
          selectedRunId={backendCache.selectedRunId}
          snapshot={backendCache.snapshot}
          saveIdea={backendCache.saveIdea}
          suggestedIdea={backendCache.suggestedIdea}
          files={files}
          busyAction={busyAction}
          onSaveIdeaChange={backendCache.setSaveIdea}
          onRunSelected={backendCache.selectRun}
          onRestoreRun={backendCache.restoreRun}
          onTestConnection={backendCache.testConnection}
          onBackupToCloud={backendCache.backupToCloud}
          onRestoreFromCloud={backendCache.restoreSelectedRun}
          onDeleteSelectedRun={backendCache.deleteSelectedRun}
          onDeleteAllCloudData={backendCache.deleteAllCloudData}
        />
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
        <WorkflowStatus
          workflow={workflow}
          qaResult={qaResult}
          busyAction={busyAction}
          busyProgress={busyProgress}
          onCancelBusyAction={cancelBusyAction}
        />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderInsightsView = () => (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Insights
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink-strong">Project insights</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Cost, output, and readiness history will live here once the workflow has durable
            analytics data.
          </p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-ink-strong">TODO</h3>
              <span className="inline-flex w-fit items-center rounded-badge border border-feedback-warning-border bg-feedback-warning-bg px-2.5 py-1 text-xs font-semibold text-feedback-warning-fg">
                Planned
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm leading-6 text-ink-muted">
              Add project-level insights after export history and generated output metrics are
              stored consistently.
            </p>
          </CardBody>
        </Card>
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
        <WorkflowStatus
          workflow={workflow}
          qaResult={qaResult}
          busyAction={busyAction}
          busyProgress={busyProgress}
          onCancelBusyAction={cancelBusyAction}
        />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderActiveSection = () => {
    if (activeSectionId === 'backend') {
      return renderBackendView();
    }

    if (activeSectionId === 'settings') {
      return renderSettingsView();
    }

    if (activeSectionId === 'insights') {
      return renderInsightsView();
    }

    return renderHomeView();
  };

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <AppSidebar
        activeSection={activeSectionId}
        expanded={isSidebarExpanded}
        onExpandedChange={setIsSidebarExpanded}
        onSectionChange={setActiveSectionId}
      />
      <div className="min-w-0">
        <Header qaResult={qaResult} />
        {renderActiveSection()}
      </div>
      {confirmRequest ? (
        <ConfirmDialog
          open
          title={confirmRequest.title}
          description={confirmRequest.description}
          confirmLabel={confirmRequest.confirmLabel}
          cancelLabel={confirmRequest.cancelLabel}
          tone={confirmRequest.tone}
          onCancel={handleConfirmCancel}
          onConfirm={handleConfirmAccept}
        />
      ) : null}
    </div>
  );
};
