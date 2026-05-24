import { useCallback, useMemo } from 'react';

import { ActivityLog } from './components/ActivityLog';
import { ArchiveActions } from './components/ArchiveActions';
import { BrowserSupportWarning } from './components/BrowserSupportWarning';
import { EtsySeoPanel } from './components/EtsySeoPanel';
import { FileReviewGrid } from './components/FileReviewGrid';
import { FileUploader } from './components/FileUploader';
import { Header } from './components/Header';
import { HowToUse } from './components/HowToUse';
import { InitialPromptPanel } from './components/InitialPromptPanel';
import { OpenAIImagePanel } from './components/OpenAIImagePanel';
import { PdfSettingsPanel } from './components/PdfSettingsPanel';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProductBriefForm } from './components/ProductBriefForm';
import { PromptManager } from './components/PromptManager';
import { QAPanel } from './components/QAPanel';
import { Button } from './components/ui/Button';
import { Card, CardBody } from './components/ui/Card';
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

import type { ProjectDraft } from './types';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const App = () => {
  const browserSupport = useMemo(() => checkBrowserSupport(), []);
  const { activityLog, addActivity } = useActivityLog();
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
    mapFile,
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
    });

  const applyDraftToProject = useCallback(
    (draft: ProjectDraft, activityMessage: string) => {
      if (files.length > 0) {
        const shouldApply = window.confirm(
          'Applying a new initial prompt replaces the mask topic list and clears existing image mappings. Continue?',
        );
        if (!shouldApply) {
          return;
        }
      }

      applyInitialDraft(draft);
      clearAllMappings();
      addActivity('project-imported', 'success', activityMessage);
    },
    [addActivity, applyInitialDraft, clearAllMappings, files.length],
  );

  const handleFillProductBrief = useCallback(
    (initialPrompt: string) => {
      void runBusyAction('brief-generation', async () => {
        const apiKey = openAISettings.apiKey.trim();

        if (!apiKey) {
          const draft = createProjectDraftFromInitialPrompt(initialPrompt);
          applyDraftToProject(
            draft,
            `Filled product brief locally with ${draft.subjects.length} topics.`,
          );
          return;
        }

        try {
          const { generateProjectDraftWithOpenAI } = await import('./lib/openaiBrief');
          const draft = await generateProjectDraftWithOpenAI({ apiKey, initialPrompt });
          applyDraftToProject(
            draft,
            `Filled product brief with OpenAI using ${draft.subjects.length} topics.`,
          );
        } catch (error) {
          addActivity(
            'error',
            'error',
            getErrorMessage(error, 'OpenAI product brief generation failed.'),
          );
        }
      });
    },
    [addActivity, applyDraftToProject, openAISettings.apiKey, runBusyAction],
  );

  const handleAddSubject = useCallback(
    (name: string) => {
      addSubject(name);
      addActivity('file-added', 'info', `Added topic ${name}.`);
    },
    [addActivity, addSubject],
  );

  const handleRemoveSubject = useCallback(
    (subjectId: string) => {
      const subjectName =
        project.subjects.find((subject) => subject.id === subjectId)?.name ?? 'subject';
      removeSubject(subjectId);
      clearSubjectMapping(subjectId);
      addActivity(
        'file-removed',
        'warning',
        `Removed ${subjectName} and cleared related mappings.`,
      );
    },
    [addActivity, clearSubjectMapping, project.subjects, removeSubject],
  );

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

  return (
    <div className="min-h-screen bg-transparent">
      <Header qaResult={qaResult} />
      <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-6">
        <div className="space-y-6">
          <BrowserSupportWarning result={browserSupport} />
          <PrivacyNotice />
          <Card>
            <CardBody>
              <p className="text-sm text-slate-700">
                Project text is saved in this browser. Uploaded files are not saved after refresh;
                export your archive or re-upload files.
              </p>
            </CardBody>
          </Card>
          <OpenAIImagePanel
            settings={openAISettings}
            missingImageCount={missingImagePrompts.length}
            subjectCount={project.subjects.length}
            busy={busyAction !== null}
            onChange={setOpenAISettings}
            onGenerateMissingImages={handleGenerateMissingSubjectImages}
          />
          <InitialPromptPanel
            hasOpenAIKey={openAISettings.apiKey.trim().length > 0}
            disabled={busyAction !== null}
            isGenerating={busyAction === 'brief-generation'}
            onFillBrief={handleFillProductBrief}
          />
          <ProductBriefForm settings={project.settings} onChange={updateSettings} />
          <EtsySeoPanel project={project} onChange={updateSettings} />
          <PdfSettingsPanel settings={project.pdfSettings} onChange={updatePdfSettings} />
          <PromptManager
            subjects={project.subjects}
            prompts={prompts}
            files={files}
            canGenerateImages={openAISettings.apiKey.trim().length > 0 && busyAction === null}
            generatingSubjectId={generatingSubjectId}
            onAddSubject={handleAddSubject}
            onRemoveSubject={handleRemoveSubject}
            onGenerateImage={handleGenerateSubjectImage}
            onCopy={(message) => addActivity('notes-updated', 'success', message)}
          />
          <FileUploader onFilesSelected={handleFilesSelected} disabled={busyAction !== null} />
          <FileReviewGrid
            files={files}
            subjects={project.subjects}
            onApprove={approveFile}
            onReject={rejectFile}
            onDelete={deleteFile}
            onMap={mapFile}
            onNotesChange={updateNotes}
            onConfirmReview={confirmReview}
          />
        </div>
        <aside className="space-y-6 lg:sticky lg:top-6">
          <WorkflowStatus
            project={project}
            files={files}
            qaResult={qaResult}
            hasOpenAIKey={openAISettings.apiKey.trim().length > 0}
          />
          <ArchiveActions
            qaResult={qaResult}
            busyAction={busyAction}
            onGeneratePdfs={generatePdfs}
            onGeneratePreviews={generatePreviews}
            onExportArchive={exportArchive}
            onExportProjectJson={exportProjectJson}
            onImportProjectJson={importProjectJson}
          />
          <QAPanel result={qaResult} />
          <HowToUse />
          <ActivityLog items={activityLog} />
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => clearFiles('Cleared in-memory files.')}
          >
            Clear uploaded/generated files
          </Button>
        </aside>
      </main>
    </div>
  );
};
