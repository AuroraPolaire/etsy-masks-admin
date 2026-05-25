import { useCallback, useMemo, useState } from 'react';

import { ActivityLog } from './components/ActivityLog';
import { AppSidebar } from './components/AppSidebar';
import { ArchiveActions } from './components/ArchiveActions';
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
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Card, CardBody, CardHeader } from './components/ui/Card';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { EmptyState } from './components/ui/EmptyState';
import { Stepper } from './components/ui/Stepper';
import { StepAdvanceButton, StepSection } from './components/ui/StepSection';
import { useToast } from './components/ui/toastContext';
import { WorkflowStatus } from './components/WorkflowStatus';
import { useActivityLog } from './hooks/useActivityLog';
import { useBusyAction } from './hooks/useBusyAction';
import { useExportActions } from './hooks/useExportActions';
import { useManagedFiles } from './hooks/useManagedFiles';
import { useOpenAIImageGeneration } from './hooks/useOpenAIImageGeneration';
import { useProjectState } from './hooks/useProjectState';
import { createProjectDraftFromInitialPrompt } from './lib/brief';
import { checkBrowserSupport } from './lib/browserSupport';
import { createPromptItems, getFileForSubject } from './lib/files';
import { runQA } from './lib/qa';

import type { AppSectionId } from './components/AppSidebar';
import type { ConfirmDialogRequest } from './components/ui/ConfirmDialog';
import type { StepperItem } from './components/ui/Stepper';
import type { ActivityLevel, ActivityType, ProjectDraft } from './types';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const toastTitles: Record<ActivityLevel, string> = {
  info: 'Updated',
  success: 'Done',
  warning: 'Needs attention',
  error: 'Something went wrong',
};

type WorkflowStepId = 'brief' | 'topics' | 'images' | 'outputs' | 'export';

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
  const [activeStepId, setActiveStepId] = useState<WorkflowStepId>('topics');
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
    replaceGeneratedFilesByKind,
  } = useManagedFiles({
    subjects: project.subjects,
    addActivity,
    onImageApproved: markImageApproved,
  });
  const { busyAction, runBusyAction } = useBusyAction();
  const prompts = useMemo(
    () => createPromptItems(project.subjects, project.settings),
    [project.settings, project.subjects],
  );
  const qaResult = useMemo(() => runQA(project, files), [project, files]);
  const approvedImageCount = useMemo(
    () => project.subjects.filter((subject) => getFileForSubject(files, subject.id)).length,
    [files, project.subjects],
  );
  const pdfCount = useMemo(
    () => files.filter((file) => file.kind === 'generated-pdf').length,
    [files],
  );
  const previewCount = useMemo(
    () => files.filter((file) => file.kind === 'generated-preview').length,
    [files],
  );
  const hasRequiredPdfs = useMemo(() => {
    const hasA4 = files.some(
      (file) => file.kind === 'generated-pdf' && file.name.includes('_A4_printable.pdf'),
    );
    const hasLetter = files.some(
      (file) => file.kind === 'generated-pdf' && file.name.includes('_US_Letter_printable.pdf'),
    );

    return (
      (!project.pdfSettings.generateA4 || hasA4) &&
      (!project.pdfSettings.generateUSLetter || hasLetter)
    );
  }, [files, project.pdfSettings.generateA4, project.pdfSettings.generateUSLetter]);
  const missingImagePrompts = useMemo(
    () => prompts.filter((prompt) => !getFileForSubject(files, prompt.subjectId)),
    [files, prompts],
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
  });
  const requestConfirmation = useCallback((request: ConfirmDialogRequest) => {
    return new Promise<boolean>((resolve) => {
      setConfirmRequest({ ...request, resolve });
    });
  }, []);

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
      void runBusyAction('brief-generation', async () => {
        const apiKey = openAISettings.apiKey.trim();

        if (!apiKey) {
          const draft = createProjectDraftFromInitialPrompt(initialPrompt);
          await applyDraftToProject(
            draft,
            `Drafted the brief locally with ${draft.subjects.length} topics.`,
          );
          return;
        }

        try {
          const { generateProjectDraftWithOpenAI } = await import('./lib/openaiBrief');
          const draft = await generateProjectDraftWithOpenAI({ apiKey, initialPrompt });
          await applyDraftToProject(
            draft,
            `Drafted the brief with OpenAI and added ${draft.subjects.length} topics.`,
          );
        } catch (error) {
          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not draft the brief with OpenAI.'),
          );
        }
      });
    },
    [addActivity, applyDraftToProject, openAISettings.apiKey, runBusyAction],
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
      void runBusyAction('image-generation', () => generateSubjectImage(subjectId));
    },
    [generateSubjectImage, runBusyAction],
  );

  const handleGenerateMissingSubjectImages = useCallback(() => {
    void runBusyAction('image-generation', generateMissingSubjectImages);
  }, [generateMissingSubjectImages, runBusyAction]);

  const briefComplete = useMemo(
    () =>
      [
        project.settings.title,
        project.settings.theme,
        project.settings.description,
        project.settings.tags,
        project.settings.safetyNote,
        project.settings.printingInstructions,
        project.settings.license,
        project.settings.refundPolicy,
      ].every((value) => value.trim().length > 0),
    [project.settings],
  );
  const topicsComplete = project.subjects.length > 0;
  const imagesComplete = topicsComplete && approvedImageCount === project.subjects.length;
  const outputsComplete = imagesComplete && hasRequiredPdfs && previewCount >= 5;
  const canGenerateOutputs = approvedImageCount > 0;
  const recommendedStepId: WorkflowStepId = !briefComplete
    ? 'brief'
    : !topicsComplete
      ? 'topics'
      : !imagesComplete
        ? 'images'
        : !outputsComplete
          ? 'outputs'
          : 'export';
  const stepMeta: Array<{
    id: WorkflowStepId;
    title: string;
    description: string;
    summary: string;
    complete: boolean;
    unlocked: boolean;
    lockedReason?: string;
  }> = [
    {
      id: 'brief',
      title: 'Idea and brief',
      description: 'Turn a product idea into buyer-facing listing copy.',
      summary: briefComplete
        ? `${project.settings.theme} brief is ready`
        : 'Complete title, description, tags, safety, license, and refund copy.',
      complete: briefComplete,
      unlocked: true,
    },
    {
      id: 'topics',
      title: 'Topics',
      description: 'Choose the masks included in the bundle.',
      summary: `${project.subjects.length} topic${project.subjects.length === 1 ? '' : 's'} configured.`,
      complete: topicsComplete,
      unlocked: briefComplete,
      lockedReason: 'Finish the brief first.',
    },
    {
      id: 'images',
      title: 'AI images',
      description: 'Generate or upload images, then approve one per topic.',
      summary: `${approvedImageCount}/${project.subjects.length} topics have approved images.`,
      complete: imagesComplete,
      unlocked: topicsComplete,
      lockedReason: 'Add at least one topic first.',
    },
    {
      id: 'outputs',
      title: 'PDFs and previews',
      description: 'Create printable PDFs and marketplace preview images.',
      summary: `${pdfCount} PDF files and ${previewCount} preview images generated.`,
      complete: outputsComplete,
      unlocked: imagesComplete,
      lockedReason: 'Approve one image per topic first.',
    },
    {
      id: 'export',
      title: 'QA and export',
      description: 'Check readiness and export the final ZIP.',
      summary:
        qaResult.status === 'etsy-ready'
          ? 'Package is Etsy-ready.'
          : `QA is ${qaResult.readinessPercentage}% ready.`,
      complete: qaResult.status === 'etsy-ready',
      unlocked: outputsComplete,
      lockedReason: 'Generate required PDFs and at least five previews first.',
    },
  ];
  const stepById = new Map(stepMeta.map((step) => [step.id, step]));
  const visibleActiveStepId = stepById.get(activeStepId)?.unlocked
    ? activeStepId
    : recommendedStepId;
  const getStepState = (stepId: WorkflowStepId) => {
    const step = stepById.get(stepId);
    if (!step?.unlocked) {
      return 'locked';
    }

    if (visibleActiveStepId === stepId) {
      return 'active';
    }

    return step.complete ? 'complete' : 'available';
  };
  const stepperItems = stepMeta.map(
    (step): StepperItem => ({
      id: step.id,
      title: step.title,
      status: !step.unlocked
        ? 'locked'
        : visibleActiveStepId === step.id
          ? 'active'
          : step.complete && visibleActiveStepId !== step.id
            ? 'complete'
            : 'available',
    }),
  );
  const renderOpenAIImagePanel = () => (
    <OpenAIImagePanel
      settings={openAISettings}
      missingImageCount={missingImagePrompts.length}
      subjectCount={project.subjects.length}
      busy={busyAction !== null}
      onChange={setOpenAISettings}
      onGenerateMissingImages={handleGenerateMissingSubjectImages}
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
        <Stepper steps={stepperItems} />
        {stepMeta.map((step, index) => (
          <StepSection
            key={step.id}
            number={index + 1}
            title={step.title}
            description={step.description}
            state={getStepState(step.id)}
            summary={step.summary}
            lockedReason={step.lockedReason}
            onActivate={() => setActiveStepId(step.id)}
          >
            {step.id === 'brief' ? (
              <div className="space-y-6">
                <InitialPromptPanel
                  hasOpenAIKey={openAISettings.apiKey.trim().length > 0}
                  disabled={busyAction !== null}
                  isGenerating={busyAction === 'brief-generation'}
                  onFillBrief={handleFillProductBrief}
                />
                <ProductBriefForm settings={project.settings} onChange={updateSettings} />
                <EtsySeoPanel project={project} onChange={updateSettings} />
                <StepAdvanceButton
                  disabled={!briefComplete}
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
                  disabled={!topicsComplete}
                  onClick={() => setActiveStepId('images')}
                >
                  Next: AI images
                </StepAdvanceButton>
              </div>
            ) : null}
            {step.id === 'images' ? (
              <div className="space-y-6">
                <PromptManager
                  subjects={project.subjects}
                  prompts={prompts}
                  files={files}
                  canGenerateImages={openAISettings.apiKey.trim().length > 0 && busyAction === null}
                  generatingSubjectId={generatingSubjectId}
                  allowTopicEditing={false}
                  onAddSubject={handleAddSubject}
                  onRemoveSubject={handleRemoveSubject}
                  onGenerateImage={handleGenerateSubjectImage}
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
                  disabled={!imagesComplete}
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
                  canGenerateOutputs={canGenerateOutputs}
                  pdfCount={pdfCount}
                  previewCount={previewCount}
                  onGeneratePdfs={generatePdfs}
                  onGeneratePreviews={generatePreviews}
                />
                <StepAdvanceButton
                  disabled={!outputsComplete}
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
                  canGenerateOutputs={canGenerateOutputs}
                  pdfCount={pdfCount}
                  previewCount={previewCount}
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
          project={project}
          files={files}
          qaResult={qaResult}
          hasOpenAIKey={openAISettings.apiKey.trim().length > 0}
        />
        <QAPanel result={qaResult} />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderAnalyticsView = () => (
    <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-6">
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
              Analytics
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink-strong">Production analytics</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Cost, output, approval, and export metrics will live here.
            </p>
          </div>
          <Badge tone="neutral">Todo</Badge>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-ink-strong">Analytics dashboard</h3>
              <Badge tone="neutral">Not wired yet</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <EmptyState>
              Analytics is planned for a future pass. Current production status remains available
              from Home and the activity feed.
            </EmptyState>
          </CardBody>
        </Card>
      </div>
    </main>
  );

  const renderSettingsView = () => (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-strong">
            Settings
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink-strong">OpenAI configuration</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Manage the session key, model, image size, quality, background, output format, and cost
            estimate for AI actions.
          </p>
        </div>
        {renderOpenAIImagePanel()}
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:pr-1">
        <WorkflowStatus
          project={project}
          files={files}
          qaResult={qaResult}
          hasOpenAIKey={openAISettings.apiKey.trim().length > 0}
        />
        <ActivityLog items={activityLog} />
        <Button className="w-full" variant="ghost" onClick={handleClearFiles}>
          Clear session files
        </Button>
      </aside>
    </main>
  );

  const renderActiveSection = () => {
    if (activeSectionId === 'analytics') {
      return renderAnalyticsView();
    }

    if (activeSectionId === 'settings') {
      return renderSettingsView();
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
