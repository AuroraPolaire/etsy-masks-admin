import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppAside } from './components/AppAside';
import { AppMainLayout } from './components/AppMainLayout';
import { AppSectionHeader } from './components/AppSectionHeader';
import { AppSidebar } from './components/AppSidebar';
import { BackendDataPanel } from './components/BackendDataPanel';
import { Header } from './components/Header';
import { HomeWorkflowView } from './components/HomeWorkflowView';
import { MarketingSettingsPanel } from './components/MarketingSettingsPanel';
import { OpenAIImagePanel } from './components/OpenAIImagePanel';
import { RunHistoryDrawer } from './components/RunHistoryDrawer';
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
import {
  discardGeneratedFileBackups,
  loadGeneratedFileBackups,
  persistGeneratedFileBackups,
} from './lib/generatedFileRecovery';
import { runQA } from './lib/qa';
import { createWorkflowState } from './workflow/workflowState';

import type { AppSectionId } from './components/AppSidebar';
import type { ConfirmDialogRequest } from './components/ui/ConfirmDialog';
import type {
  ActivityLevel,
  ActivityType,
  BusyActionContext,
  BriefReferenceImage,
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isRunHistoryOpen, setIsRunHistoryOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<
    (ConfirmDialogRequest & { resolve: (confirmed: boolean) => void }) | null
  >(null);
  const generatedCloudSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const recoveredGeneratedProjectsRef = useRef(new Set<string>());
  const {
    project,
    replaceProject,
    updateSettings,
    updateOpenAIImageSettings,
    updateColoringPageQuality,
    updateMarketingSettings,
    applyInitialDraft,
    applyEtsySeoAnalysis,
    addSubject,
    removeSubject,
  } = useProjectState();
  const {
    files,
    filesRef,
    appendFiles,
    deleteFile,
    clearSubjectMapping,
    clearFiles,
    replaceFiles,
  } = useManagedFiles({
    subjects: project.subjects,
    addActivity,
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

  useEffect(() => {
    if (
      backendCache.autosaveState.status === 'restoring' ||
      recoveredGeneratedProjectsRef.current.has(project.id)
    ) {
      return;
    }

    recoveredGeneratedProjectsRef.current.add(project.id);
    void loadGeneratedFileBackups(project.id)
      .then((recoveredFiles) => {
        const existingIds = new Set(filesRef.current.map((file) => file.id));
        const duplicateIds = recoveredFiles
          .filter((file) => existingIds.has(file.id))
          .map((file) => file.id);
        const missingFiles = recoveredFiles.filter((file) => !existingIds.has(file.id));

        if (duplicateIds.length > 0) {
          void discardGeneratedFileBackups(duplicateIds);
        }

        if (missingFiles.length === 0) {
          return;
        }

        const nextFiles = [...filesRef.current, ...missingFiles];
        filesRef.current = nextFiles;
        appendFiles(missingFiles);
        addActivity(
          'cloud-synced',
          'warning',
          `Recovered ${missingFiles.length} generated file${
            missingFiles.length === 1 ? '' : 's'
          } that had not been saved online yet. Retrying online save.`,
        );
        window.setTimeout(() => backendCache.retryCloudSave(), 0);
      })
      .catch((error) => {
        addActivity(
          'error',
          'error',
          `Could not read local generated file recovery data: ${getErrorMessage(
            error,
            'Recovery store is unavailable.',
          )}`,
        );
      });
  }, [addActivity, appendFiles, backendCache, filesRef, project.id]);

  const appendGeneratedFiles = useCallback(
    async (managedFiles: ManagedFile[], context?: BusyActionContext) => {
      if (managedFiles.length === 0) {
        return;
      }

      try {
        context?.setProgress('Saving generated files locally for recovery...');
        await persistGeneratedFileBackups(project.id, managedFiles);
      } catch (error) {
        addActivity(
          'error',
          'error',
          `Generated files were created, but local recovery backup failed: ${getErrorMessage(
            error,
            'Could not save generated files in this browser.',
          )}`,
        );
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
            `Generated files were added locally, but online save failed: ${getErrorMessage(
              error,
              'Could not save generated files online.',
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
        throw new Error('Online AI is required before generating images.');
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
        throw new Error('Online AI is required before generating coloring pages.');
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
        throw new Error('Online AI is required before generating marketing assets.');
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
    coloringPageQuality: project.coloringPageQuality,
    filesRef,
    appendGeneratedFiles,
    addActivity,
    onSettingsChange: updateOpenAIImageSettings,
    generateImageFile,
    generateColoringPageFile,
  });
  const { generateSloganPreviews, generateMaskSheets, generateChildrenScenePreviews } =
    useMarketingAssetGeneration({
      project,
      filesRef,
      appendGeneratedFiles,
      addActivity,
      generateMarketingSceneFile,
    });
  const hasAIProvider = backendCache.canUseOpenAIProxy;
  const { ensureSavedRunsLoaded } = backendCache;

  useEffect(() => {
    if (activeSectionId === 'backend') {
      ensureSavedRunsLoaded();
    }
  }, [activeSectionId, ensureSavedRunsLoaded]);

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
    ? 'Connect online AI before generating images.'
    : missingImagePrompts.length === 0
      ? missingColoringPagePrompts.length === 0
        ? 'All topics have color masks and coloring pages.'
        : `${missingColoringPagePrompts.length} mask${
            missingColoringPagePrompts.length === 1 ? '' : 's'
          } still need a coloring page.`
      : `${missingImagePrompts.length} topic${missingImagePrompts.length === 1 ? '' : 's'} still need a color mask.`;
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
            'A new brief replaces the topic list and clears assigned generated images. The current project will be saved online first.',
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
            `Current generated files were not replaced because online save failed: ${getErrorMessage(
              error,
              'Could not save the current project online.',
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
    (initialPrompt: string, referenceImages: BriefReferenceImage[]) => {
      void runBusyAction('brief-generation', async ({ setProgress, signal }) => {
        setProgress('Drafting product brief...');

        if (!backendCache.canUseOpenAIProxy) {
          addActivity('error', 'error', 'Connect online AI before drafting.');
          return;
        }

        try {
          const draft = await backendCache.generateProjectDraft(
            initialPrompt,
            referenceImages,
            signal,
          );
          if (signal.aborted) {
            return;
          }
          await applyDraftToProject(
            draft,
            `Drafted the brief with online AI and added ${draft.subjects.length} topics.`,
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
            getErrorMessage(error, 'Could not draft the brief with online AI.'),
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
        addActivity('error', 'error', 'Connect online AI before AI review.');
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
          getErrorMessage(error, 'Could not run AI listing review with online AI.'),
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
          void discardGeneratedFileBackups([fileId]);
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
          'This saves the current project online, then clears generated files from this browser tab and starts a fresh draft copy.',
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
                ? 'Cleared session files. Previous files remain in saved work.'
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
              `Files were not cleared because online save failed: ${getErrorMessage(
                error,
                'Could not save the current project online.',
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

  const handleGenerateMaskSheets = useCallback(() => {
    void runBusyAction('marketing-generation', generateMaskSheets);
  }, [generateMaskSheets, runBusyAction]);

  const handleGenerateChildrenScenePreviews = useCallback(() => {
    void runBusyAction('marketing-generation', generateChildrenScenePreviews);
  }, [generateChildrenScenePreviews, runBusyAction]);

  const renderOpenAIImagePanel = () => (
    <OpenAIImagePanel
      settings={openAISettings}
      coloringPageQuality={project.coloringPageQuality}
      missingImageCount={missingImagePrompts.length}
      subjectCount={project.subjects.length}
      backendOpenAIReady={backendCache.canUseOpenAIProxy}
      onChange={setOpenAISettings}
      onColoringPageQualityChange={updateColoringPageQuality}
    />
  );

  const renderAside = () => (
    <AppAside
      workflow={workflow}
      qaResult={qaResult}
      busyAction={busyAction}
      busyProgress={busyProgress}
      autosaveState={backendCache.autosaveState}
      runRevisions={backendCache.runRevisions}
      historyBusy={backendCache.historyBusy}
      historyError={backendCache.historyError}
      onCancelBusyAction={cancelBusyAction}
      onOpenHistory={() => setIsRunHistoryOpen(true)}
      onRetryCloudSave={backendCache.retryCloudSave}
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
        onGenerateMaskSheets={handleGenerateMaskSheets}
        onGenerateChildrenScenePreviews={handleGenerateChildrenScenePreviews}
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
        description="Choose a simple image quality preset, or open advanced settings when you need exact model, size, format, and cost controls."
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
        eyebrow="Online save"
        title="Saved work"
        description="Review autosaved projects, search previous work by idea, restore a project, or delete work you no longer need."
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
      <RunHistoryDrawer
        open={isRunHistoryOpen}
        revisions={backendCache.runRevisions}
        historyBusy={backendCache.historyBusy || busyAction === 'backend-sync'}
        onClose={() => setIsRunHistoryOpen(false)}
        onRestoreRevision={backendCache.restoreRevision}
      />
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
