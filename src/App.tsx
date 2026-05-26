import { useCallback, useMemo, useRef, useState } from 'react';

import { AppAside } from './components/AppAside';
import { AppMainLayout } from './components/AppMainLayout';
import { AppSectionHeader } from './components/AppSectionHeader';
import { AppSidebar } from './components/AppSidebar';
import { BackendDataPanel } from './components/BackendDataPanel';
import { Header } from './components/Header';
import { HomeWorkflowView } from './components/HomeWorkflowView';
import { MarketingSettingsPanel } from './components/MarketingSettingsPanel';
import { OpenAIImagePanel } from './components/OpenAIImagePanel';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useToast } from './components/ui/toastContext';
import { useActivityLog } from './hooks/useActivityLog';
import { useBackendCache } from './hooks/useBackendCache';
import { useBusyAction } from './hooks/useBusyAction';
import { useExportActions } from './hooks/useExportActions';
import { useManagedFiles } from './hooks/useManagedFiles';
import { useMarketingAssetGeneration } from './hooks/useMarketingAssetGeneration';
import { useOpenAIImageGeneration } from './hooks/useOpenAIImageGeneration';
import { useProjectState } from './hooks/useProjectState';
import { checkBrowserSupport } from './lib/browserSupport';
import { nowIso } from './lib/dates';
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
  BusyActionContext,
  ManagedFile,
  MarketingGenerationRecipe,
  MarketingImageSettings,
  OpenAIImageSettings,
  Project,
  ProjectDraft,
  PromptItem,
} from './types';
import type { WorkflowStepId } from './workflow/workflowState';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const createFreshProjectCopy = (project: Project): Project => {
  const timestamp = nowIso();

  return {
    ...project,
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const toastTitles: Record<ActivityLevel, string> = {
  info: 'Updated',
  success: 'Done',
  warning: 'Needs attention',
  error: 'Something went wrong',
};

export const App = () => {
  const browserSupport = useMemo(() => checkBrowserSupport(), []);
  const { showToast } = useToast();
  const { addActivity: recordActivity } = useActivityLog();
  const addActivity = useCallback(
    (type: ActivityType, level: ActivityLevel, message: string) => {
      recordActivity(type, level, message);
      if (level === 'warning' || level === 'error') {
        showToast({
          tone: level,
          title: toastTitles[level],
          message,
        });
      }
    },
    [recordActivity, showToast],
  );
  const [activeStepId, setActiveStepId] = useState<WorkflowStepId>('brief');
  const [activeSectionId, setActiveSectionId] = useState<AppSectionId>('home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<
    (ConfirmDialogRequest & { resolve: (confirmed: boolean) => void }) | null
  >(null);
  const generatedCloudSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const {
    project,
    replaceProject,
    updateSettings,
    updateOpenAIImageSettings,
    updateMarketingSettings,
    applyInitialDraft,
    applyEtsySeoAnalysis,
    addSubject,
    removeSubject,
    markImageApproved,
  } = useProjectState();
  const {
    files,
    filesRef,
    appendFiles,
    approveFile,
    approveFiles,
    deleteFile,
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
    appendFiles,
    addActivity,
    runBusyAction,
    confirmAction: requestConfirmation,
  });
  const appendGeneratedFiles = useCallback(
    async (managedFiles: ManagedFile[], context?: BusyActionContext) => {
      if (managedFiles.length === 0) {
        return;
      }

      const nextFiles = [...filesRef.current, ...managedFiles];
      filesRef.current = nextFiles;
      appendFiles(managedFiles);

      if (!backendCache.canUseOpenAIProxy) {
        return;
      }

      const saveGeneratedFiles = async () => {
        try {
          await backendCache.saveDraftNow({
            projectOverride: project,
            filesOverride: nextFiles,
            deleteMissingRemoteFiles: false,
            setProgress: (message) => {
              context?.setProgress(message ? `Saving generated files: ${message}` : null);
            },
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }

          addActivity(
            'error',
            'error',
            `Generated files were added locally, but cloud save failed: ${getErrorMessage(
              error,
              'Could not save generated files to Cloudflare.',
            )}`,
          );
        }
      };

      const queuedSave = generatedCloudSaveQueueRef.current
        .catch(() => undefined)
        .then(saveGeneratedFiles);
      generatedCloudSaveQueueRef.current = queuedSave;
      await queuedSave;
    },
    [addActivity, appendFiles, backendCache, filesRef, project],
  );
  const saveCurrentRunBeforeLocalFileReset = useCallback(
    async (context: BusyActionContext, progressPrefix: string) => {
      await generatedCloudSaveQueueRef.current.catch(() => undefined);

      const currentFiles = filesRef.current;
      if (currentFiles.length === 0) {
        return;
      }

      await backendCache.saveDraftNow({
        projectOverride: project,
        filesOverride: currentFiles,
        signal: context.signal,
        setProgress: (message) => {
          context.setProgress(message ? `${progressPrefix}: ${message}` : null);
        },
      });
    },
    [backendCache, filesRef, project],
  );
  const generateImageFile = useCallback(
    async (
      settings: OpenAIImageSettings,
      prompt: PromptItem,
      signal?: AbortSignal,
    ): Promise<File> => {
      if (!backendCache.canUseOpenAIProxy) {
        throw new Error('Cloud OpenAI proxy is required before generating images.');
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
        throw new Error('Cloud OpenAI proxy is required before generating coloring pages.');
      }

      return backendCache.generateColoringPageImage(settings, prompt, sourceFile, signal);
    },
    [backendCache],
  );
  const generateMarketingSceneFile = useCallback(
    async (
      settings: MarketingImageSettings,
      projectOverride: typeof project,
      sourceFiles: ManagedFile[],
      recipe: MarketingGenerationRecipe,
      signal?: AbortSignal,
    ): Promise<File> => {
      if (!backendCache.canUseOpenAIProxy) {
        throw new Error('Cloud OpenAI proxy is required before generating marketing assets.');
      }

      return backendCache.generateMarketingSceneImage(
        settings,
        projectOverride,
        sourceFiles,
        recipe,
        signal,
      );
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
    appendGeneratedFiles,
    addActivity,
    onSettingsChange: updateOpenAIImageSettings,
    generateImageFile,
    generateColoringPageFile,
  });
  const {
    generateSloganPreviews,
    finalizeSloganPoster,
    generateMaskSheets,
    generateChildrenScenePreviews,
    finalizeChildrenScene,
  } = useMarketingAssetGeneration({
    project,
    filesRef,
    appendGeneratedFiles,
    addActivity,
    generateMarketingSceneFile,
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
    ? 'Configure the Cloud OpenAI proxy to generate images.'
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

  const { exportArchive } = useExportActions({
    project,
    files,
    replaceProject,
    clearFiles,
    addActivity,
    runBusyAction,
    confirmAction: requestConfirmation,
  });

  const applyDraftToProject = useCallback(
    async (draft: ProjectDraft, activityMessage: string, context?: BusyActionContext) => {
      if (files.length > 0) {
        const shouldApply = await requestConfirmation({
          title: 'Replace current topics?',
          description:
            'A new brief replaces the topic list and clears assigned generated images. The current run will be saved to Cloud first.',
          confirmLabel: 'Replace topics',
        });
        if (!shouldApply) {
          return;
        }

        try {
          context?.setProgress('Saving current run before replacing topics...');
          const saveContext =
            context ??
            ({
              signal: new AbortController().signal,
              setProgress: () => undefined,
            } satisfies BusyActionContext);
          await saveCurrentRunBeforeLocalFileReset(
            saveContext,
            'Saving current run before replacing topics',
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            addActivity('project-imported', 'warning', 'Brief replacement was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            `Current generated files were not replaced because cloud save failed: ${getErrorMessage(
              error,
              'Could not save the current run to Cloudflare.',
            )}`,
          );
          return;
        }
      }

      applyInitialDraft(draft);
      if (files.length > 0) {
        clearFiles();
      }
      addActivity('project-imported', 'success', activityMessage);
    },
    [
      addActivity,
      applyInitialDraft,
      clearFiles,
      files,
      requestConfirmation,
      saveCurrentRunBeforeLocalFileReset,
    ],
  );

  const handleFillProductBrief = useCallback(
    (initialPrompt: string) => {
      void runBusyAction('brief-generation', async ({ setProgress, signal }) => {
        setProgress('Drafting product brief...');

        if (!backendCache.canUseOpenAIProxy) {
          addActivity('error', 'error', 'Configure the Cloud OpenAI proxy before drafting.');
          return;
        }

        try {
          const draft = await backendCache.generateProjectDraft(initialPrompt, signal);
          if (signal.aborted) {
            return;
          }
          await applyDraftToProject(
            draft,
            `Drafted the brief through the Cloud proxy and added ${draft.subjects.length} topics.`,
            { signal, setProgress },
          );
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            addActivity('project-imported', 'warning', 'Brief generation was cancelled.');
            return;
          }

          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'Could not draft the brief through the Cloud proxy.'),
          );
        }
      });
    },
    [addActivity, applyDraftToProject, backendCache, runBusyAction],
  );

  const handleAnalyzeListingWithAI = useCallback(() => {
    void runBusyAction('ai-analysis', async ({ setProgress, signal }) => {
      setProgress('Running AI listing review...');

      if (!backendCache.canUseOpenAIProxy) {
        addActivity('error', 'error', 'Configure the Cloud OpenAI proxy before AI review.');
        return;
      }

      try {
        const analysis = await backendCache.generateEtsySeoAnalysis(project, files, signal);
        if (signal.aborted) {
          return;
        }

        applyEtsySeoAnalysis(analysis);
        addActivity('project-imported', 'success', 'AI reviewed the Etsy SEO and QA copy.');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          addActivity('project-imported', 'warning', 'AI listing review was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          getErrorMessage(error, 'Could not run AI listing review through the Cloud proxy.'),
        );
      }
    });
  }, [addActivity, applyEtsySeoAnalysis, backendCache, files, project, runBusyAction]);

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
          description: 'This removes the topic and clears its assigned generated image.',
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
          description: 'This removes the file from this session. Generate it again if needed.',
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
          'This saves the current run to Cloud, then clears generated files from this browser tab and starts a fresh draft copy.',
        confirmLabel: 'Clear files',
        tone: 'danger',
      });

      if (shouldClear) {
        void runBusyAction('backend-sync', async (context) => {
          try {
            const hadFiles = filesRef.current.length > 0;
            context.setProgress('Saving current run before clearing this tab...');
            await saveCurrentRunBeforeLocalFileReset(
              context,
              'Saving current run before clearing this tab',
            );
            if (hadFiles) {
              const nextProject = createFreshProjectCopy(project);
              backendCache.startFreshDraft(nextProject.id);
              replaceProject(nextProject);
            }
            clearFiles(
              hadFiles
                ? 'Cleared session files. Previous files remain in the saved cloud run.'
                : 'Cleared session files.',
            );
            if (hadFiles) {
              addActivity(
                'cloud-synced',
                'success',
                'Saved the previous run before clearing this browser tab.',
              );
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              addActivity('cloud-synced', 'warning', 'File clearing was cancelled.');
              return;
            }

            addActivity(
              'error',
              'error',
              `Files were not cleared because cloud save failed: ${getErrorMessage(
                error,
                'Could not save the current run to Cloudflare.',
              )}`,
            );
          }
        });
      }
    })();
  }, [
    addActivity,
    backendCache,
    clearFiles,
    filesRef,
    project,
    replaceProject,
    requestConfirmation,
    runBusyAction,
    saveCurrentRunBeforeLocalFileReset,
  ]);

  const handleGenerateSubjectImage = useCallback(
    (subjectId: string, promptOverride?: string) => {
      void runBusyAction('image-generation', (context) =>
        generateSubjectImage(subjectId, context, promptOverride),
      );
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

  const handleGenerateSloganPreviews = useCallback(() => {
    void runBusyAction('marketing-generation', generateSloganPreviews);
  }, [generateSloganPreviews, runBusyAction]);

  const handleFinalizeSloganPoster = useCallback(
    (previewFileId: string) => {
      void runBusyAction('marketing-generation', (context) =>
        finalizeSloganPoster(previewFileId, context),
      );
    },
    [finalizeSloganPoster, runBusyAction],
  );

  const handleGenerateMaskSheets = useCallback(() => {
    void runBusyAction('marketing-generation', generateMaskSheets);
  }, [generateMaskSheets, runBusyAction]);

  const handleGenerateChildrenScenePreviews = useCallback(() => {
    void runBusyAction('marketing-generation', generateChildrenScenePreviews);
  }, [generateChildrenScenePreviews, runBusyAction]);

  const handleFinalizeChildrenScene = useCallback(
    (previewFileId: string) => {
      void runBusyAction('marketing-generation', (context) =>
        finalizeChildrenScene(previewFileId, context),
      );
    },
    [finalizeChildrenScene, runBusyAction],
  );

  const handleApproveFile = useCallback(
    (fileId: string) => {
      approveFile(fileId);
    },
    [approveFile],
  );

  const handleApproveFiles = useCallback(
    (fileIds: string[]) => {
      approveFiles(fileIds);
    },
    [approveFiles],
  );

  const renderOpenAIImagePanel = () => (
    <OpenAIImagePanel
      settings={openAISettings}
      missingImageCount={missingImagePrompts.length}
      subjectCount={project.subjects.length}
      backendOpenAIReady={backendCache.canUseOpenAIProxy}
      onChange={setOpenAISettings}
    />
  );

  const renderAside = () => (
    <AppAside
      workflow={workflow}
      qaResult={qaResult}
      busyAction={busyAction}
      busyProgress={busyProgress}
      onCancelBusyAction={cancelBusyAction}
    />
  );

  const renderHomeView = () => (
    <AppMainLayout aside={renderAside()}>
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
        onAnalyzeListingWithAI={handleAnalyzeListingWithAI}
        onUpdateSettings={updateSettings}
        onUpdateMarketingSettings={updateMarketingSettings}
        onAddSubject={handleAddSubject}
        onRemoveSubject={handleRemoveSubject}
        onGenerateImage={handleGenerateSubjectImage}
        onGenerateMissingImages={handleGenerateMissingSubjectImages}
        onGenerateColoringPage={handleGenerateSubjectColoringPage}
        onGenerateMissingColoringPages={handleGenerateMissingColoringPages}
        onGenerateSloganPreviews={handleGenerateSloganPreviews}
        onFinalizeSloganPoster={handleFinalizeSloganPoster}
        onGenerateMaskSheets={handleGenerateMaskSheets}
        onGenerateChildrenScenePreviews={handleGenerateChildrenScenePreviews}
        onFinalizeChildrenScene={handleFinalizeChildrenScene}
        onApproveAllFiles={handleApproveFiles}
        onApproveFile={handleApproveFile}
        onDeleteFile={handleDeleteFile}
        onCopyPrompt={(message) => addActivity('prompt-copied', 'success', message)}
        onExportArchive={exportArchive}
      />
    </AppMainLayout>
  );

  const renderSettingsView = () => (
    <AppMainLayout aside={renderAside()}>
      <AppSectionHeader
        eyebrow="Settings"
        title="Image generation settings"
        description="Manage the model, API image size, quality, background, output format, and cost estimate used by Cloud AI generation."
      />
      {renderOpenAIImagePanel()}
      <div className="mt-6">
        <MarketingSettingsPanel
          settings={project.marketingSettings}
          maskSettings={project.openAIImageSettings}
          onChange={updateMarketingSettings}
        />
      </div>
    </AppMainLayout>
  );

  const renderBackendView = () => (
    <AppMainLayout aside={renderAside()}>
      <AppSectionHeader
        eyebrow="Cloud"
        title="Cloud"
        description="Review automatic cloud drafts, search previous work by idea, restore a run, or delete runs you no longer need."
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
        onClearSessionFiles={handleClearFiles}
      />
    </AppMainLayout>
  );

  const renderActiveSection = () => {
    if (activeSectionId === 'backend') {
      return renderBackendView();
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
