import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppAside } from './components/AppAside';
import { AppMainLayout } from './components/AppMainLayout';
import { AppSectionHeader } from './components/AppSectionHeader';
import { AppSidebar } from './components/AppSidebar';
import { BackendDataPanel } from './components/BackendDataPanel';
import { Header } from './components/Header';
import { HomeWorkflowView } from './components/HomeWorkflowView';
import { InsightsPanel } from './components/InsightsPanel';
import { OpenAIImagePanel } from './components/OpenAIImagePanel';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useToast } from './components/ui/toastContext';
import { useActivityLog } from './hooks/useActivityLog';
import { useBackendCache } from './hooks/useBackendCache';
import { useBusyAction } from './hooks/useBusyAction';
import { useExportActions } from './hooks/useExportActions';
import { useManagedFiles } from './hooks/useManagedFiles';
import { useOpenAIImageGeneration } from './hooks/useOpenAIImageGeneration';
import { useProjectState } from './hooks/useProjectState';
import { checkBrowserSupport } from './lib/browserSupport';
import {
  createPromptItems,
  getCurrentColoringPageForSubject,
  getFileForSubject,
} from './lib/files';
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
  const [hasAutoLoadedCloudSaves, setHasAutoLoadedCloudSaves] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<
    (ConfirmDialogRequest & { resolve: (confirmed: boolean) => void }) | null
  >(null);
  const {
    project,
    replaceProject,
    updateSettings,
    updateOpenAIImageSettings,
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
    approveFiles,
    rejectFile,
    deleteFile,
    updateNotes,
    clearAllMappings,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
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
  const missingColoringPagePrompts = useMemo(
    () =>
      prompts.filter((prompt) => {
        const approvedColorFile = getFileForSubject(files, prompt.subjectId);

        return (
          approvedColorFile &&
          !getCurrentColoringPageForSubject(files, prompt.subjectId, approvedColorFile)
        );
      }),
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
  const backendHealth = backendCache.health;
  const testBackendConnection = backendCache.testConnection;
  useEffect(() => {
    if (
      activeSectionId === 'backend' &&
      !hasAutoLoadedCloudSaves &&
      backendHealth === null &&
      busyAction === null
    ) {
      setHasAutoLoadedCloudSaves(true);
      testBackendConnection();
    }
  }, [activeSectionId, backendHealth, busyAction, hasAutoLoadedCloudSaves, testBackendConnection]);
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
  const generateColoringPageFile = useCallback(
    async (
      settings: OpenAIImageSettings,
      prompt: PromptItem,
      sourceFile: File,
      signal?: AbortSignal,
    ): Promise<File> => {
      if (!backendCache.canUseOpenAIProxy) {
        throw new Error('Backend OpenAI proxy is required before generating coloring pages.');
      }

      return backendCache.generateColoringPageImage(settings, prompt, sourceFile, signal);
    },
    [backendCache],
  );
  const {
    openAISettings,
    setOpenAISettings,
    generatingSubjectIds,
    generatingColoringPageSubjectIds,
    generateSubjectImage,
    generateMissingSubjectImages,
    generateSubjectColoringPage,
    generateMissingColoringPages,
  } = useOpenAIImageGeneration({
    subjects: project.subjects,
    prompts,
    missingImagePrompts,
    settings: project.openAIImageSettings,
    filesRef,
    appendFiles,
    addActivity,
    onSettingsChange: updateOpenAIImageSettings,
    generateImageFile,
    generateColoringPageFile,
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
    ? 'Configure the backend OpenAI proxy to generate images.'
    : missingImagePrompts.length === 0
      ? missingColoringPagePrompts.length === 0
        ? 'All topics have approved color masks and coloring pages.'
        : `${missingColoringPagePrompts.length} approved mask${
            missingColoringPagePrompts.length === 1 ? '' : 's'
          } still need a coloring page.`
      : `${missingImagePrompts.length} topic${missingImagePrompts.length === 1 ? '' : 's'} still need an approved image.`;
  const handleConfirmCancel = useCallback(() => {
    confirmRequest?.resolve(false);
    setConfirmRequest(null);
  }, [confirmRequest]);

  const handleConfirmAccept = useCallback(() => {
    confirmRequest?.resolve(true);
    setConfirmRequest(null);
  }, [confirmRequest]);

  const { exportProjectJson, importProjectJson, exportArchive } = useExportActions({
    project,
    files,
    replaceProject,
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

  const handleGenerateSubjectColoringPage = useCallback(
    (subjectId: string) => {
      void runBusyAction('image-generation', (context) =>
        generateSubjectColoringPage(subjectId, context),
      );
    },
    [generateSubjectColoringPage, runBusyAction],
  );

  const handleGenerateMissingColoringPages = useCallback(() => {
    void runBusyAction('image-generation', generateMissingColoringPages);
  }, [generateMissingColoringPages, runBusyAction]);

  const renderOpenAIImagePanel = () => (
    <OpenAIImagePanel
      settings={openAISettings}
      missingImageCount={missingImagePrompts.length}
      subjectCount={project.subjects.length}
      backendOpenAIReady={backendCache.canUseOpenAIProxy}
      onChange={setOpenAISettings}
    />
  );

  const renderAside = (showQA = false) => (
    <AppAside
      workflow={workflow}
      qaResult={qaResult}
      busyAction={busyAction}
      busyProgress={busyProgress}
      activityLog={activityLog}
      showQA={showQA}
      onCancelBusyAction={cancelBusyAction}
      onClearFiles={handleClearFiles}
    />
  );

  const renderHomeView = () => (
    <AppMainLayout aside={renderAside(true)}>
      <HomeWorkflowView
        browserSupport={browserSupport}
        workflow={workflow}
        project={project}
        prompts={prompts}
        files={files}
        qaResult={qaResult}
        hasAIProvider={hasAIProvider}
        busyAction={busyAction}
        generatingSubjectIds={generatingSubjectIds}
        generatingColoringPageSubjectIds={generatingColoringPageSubjectIds}
        missingImageCount={missingImagePrompts.length}
        missingColoringPageCount={missingColoringPagePrompts.length}
        imageGenerationHint={imageGenerationHint}
        onStepSelected={setActiveStepId}
        onOpenCloudSaves={() => setActiveSectionId('backend')}
        onFillProductBrief={handleFillProductBrief}
        onUpdateSettings={updateSettings}
        onAddSubject={handleAddSubject}
        onRemoveSubject={handleRemoveSubject}
        onGenerateImage={handleGenerateSubjectImage}
        onGenerateMissingImages={handleGenerateMissingSubjectImages}
        onGenerateColoringPage={handleGenerateSubjectColoringPage}
        onGenerateMissingColoringPages={handleGenerateMissingColoringPages}
        onApproveAllFiles={approveFiles}
        onApproveFile={approveFile}
        onRejectFile={rejectFile}
        onDeleteFile={handleDeleteFile}
        onNotesChange={updateNotes}
        onCopyPrompt={(message) => addActivity('notes-updated', 'success', message)}
        onFilesSelected={handleFilesSelected}
        onExportArchive={exportArchive}
        onExportProjectJson={exportProjectJson}
        onImportProjectJson={importProjectJson}
      />
    </AppMainLayout>
  );

  const renderSettingsView = () => (
    <AppMainLayout aside={renderAside()}>
      <AppSectionHeader
        eyebrow="Settings"
        title="Image generation settings"
        description="Manage the model, image size, quality, background, output format, and cost estimate used by backend AI generation."
      />
      {renderOpenAIImagePanel()}
    </AppMainLayout>
  );

  const renderBackendView = () => (
    <AppMainLayout aside={renderAside()}>
      <AppSectionHeader
        eyebrow="Backend saves"
        title="Backend saves"
        description="Review automatic backend drafts, search previous work by idea, restore a run, or delete runs you no longer need."
      />
      <BackendDataPanel
        health={backendCache.health}
        runs={backendCache.runs}
        selectedRunId={backendCache.selectedRunId}
        autosaveState={backendCache.autosaveState}
        snapshot={backendCache.snapshot}
        saveIdea={backendCache.saveIdea}
        suggestedIdea={backendCache.suggestedIdea}
        files={files}
        busyAction={busyAction}
        onSaveIdeaChange={backendCache.setSaveIdea}
        onRunSelected={backendCache.selectRun}
        onRestoreRun={backendCache.restoreRun}
        onTestConnection={backendCache.testConnection}
        onDeleteRun={backendCache.deleteRun}
        onDeleteAllCloudData={backendCache.deleteAllCloudData}
      />
    </AppMainLayout>
  );

  const renderInsightsView = () => (
    <AppMainLayout aside={renderAside()}>
      <AppSectionHeader
        eyebrow="Insights"
        title="Project insights"
        description="Review current readiness, file counts, and local save/export history before publishing."
      />
      <InsightsPanel project={project} files={files} qaResult={qaResult} workflow={workflow} />
    </AppMainLayout>
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
