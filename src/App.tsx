import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActivityLog } from './components/ActivityLog';
import { ArchiveActions } from './components/ArchiveActions';
import { BrowserSupportWarning } from './components/BrowserSupportWarning';
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
import { APP_VERSION, DEFAULT_OPENAI_IMAGE_SETTINGS } from './constants';
import { checkBrowserSupport } from './lib/browserSupport';
import {
  createManagedFile,
  createPromptItems,
  dedupeIncomingFiles,
  downloadBlob,
  fileToText,
  getExpectedFilename,
  getFileForSubject,
  groupFilesForExport,
  replaceGeneratedFiles,
} from './lib/files';
import { runQA } from './lib/qa';
import { slugify } from './lib/slugify';
import { createProjectBackup, loadProject, parseProjectBackup, saveProject } from './lib/storage';

import type {
  ActivityItem,
  ActivityLevel,
  ActivityType,
  SubjectItem,
  ManagedFile,
  OpenAIImageSettings,
  Project,
  ProjectSettings,
  PdfSettings,
} from './types';

type BusyAction =
  | 'uploading'
  | 'image-generation'
  | 'pdfs'
  | 'previews'
  | 'archive'
  | 'project-json'
  | 'import'
  | null;

const nowIso = () => new Date().toISOString();

const clearMappedSubject = (file: ManagedFile): ManagedFile => {
  const nextFile = { ...file };
  delete nextFile.mappedSubjectId;
  return nextFile;
};

const withMappedSubject = (file: ManagedFile, subjectId: string | undefined): ManagedFile => {
  if (!subjectId) {
    return clearMappedSubject(file);
  }

  return {
    ...file,
    mappedSubjectId: subjectId,
  };
};

const revokeObjectUrl = (file: ManagedFile): void => {
  if (file.objectUrl) {
    URL.revokeObjectURL(file.objectUrl);
  }
};

const makeUniqueFile = (file: File, existingFiles: ManagedFile[]): File => {
  const existingNames = new Set(existingFiles.map((managedFile) => managedFile.name.toLowerCase()));
  if (!existingNames.has(file.name.toLowerCase())) {
    return file;
  }

  const extension = file.name.split('.').pop() ?? 'png';
  const baseName = file.name.replace(new RegExp(`\\.${extension}$`, 'i'), '');
  let counter = 2;
  let nextName = `${baseName}-${counter}.${extension}`;

  while (existingNames.has(nextName.toLowerCase())) {
    counter += 1;
    nextName = `${baseName}-${counter}.${extension}`;
  }

  return new File([file], nextName, { type: file.type || 'image/png' });
};

export const App = () => {
  const [project, setProject] = useState<Project>(() => loadProject());
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const filesRef = useRef<ManagedFile[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [generatingSubjectId, setGeneratingSubjectId] = useState<string | null>(null);
  const [openAISettings, setOpenAISettings] = useState<OpenAIImageSettings>(
    DEFAULT_OPENAI_IMAGE_SETTINGS,
  );
  const browserSupport = useMemo(() => checkBrowserSupport(), []);
  const prompts = useMemo(() => createPromptItems(project.subjects), [project.subjects]);
  const qaResult = useMemo(() => runQA(project, files), [project, files]);
  const missingImagePrompts = useMemo(
    () => prompts.filter((prompt) => !getFileForSubject(files, prompt.subjectId)),
    [files, prompts],
  );

  const addActivity = useCallback((type: ActivityType, level: ActivityLevel, message: string) => {
    setActivityLog((items) =>
      [
        {
          id: crypto.randomUUID(),
          type,
          level,
          message,
          createdAt: nowIso(),
        },
        ...items,
      ].slice(0, 80),
    );
  }, []);

  const updateProject = useCallback((updater: (project: Project) => Project) => {
    setProject((currentProject) => {
      const updated = updater(currentProject);
      return {
        ...updated,
        updatedAt: nowIso(),
      };
    });
  }, []);

  useEffect(() => {
    saveProject(project);
  }, [project]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => filesRef.current.forEach(revokeObjectUrl), []);

  const handleSettingsChange = (settings: ProjectSettings) => {
    updateProject((currentProject) => ({ ...currentProject, settings }));
  };

  const handlePdfSettingsChange = (pdfSettings: PdfSettings) => {
    updateProject((currentProject) => ({ ...currentProject, pdfSettings }));
  };

  const handleApplyInitialDraft = (draft: {
    settings: ProjectSettings;
    subjects: SubjectItem[];
  }) => {
    if (files.length > 0) {
      const shouldApply = window.confirm(
        'Applying a new initial prompt replaces the mask topic list and clears existing image mappings. Continue?',
      );
      if (!shouldApply) {
        return;
      }
    }

    updateProject((currentProject) => ({
      ...currentProject,
      settings: draft.settings,
      subjects: draft.subjects,
    }));
    setFiles((currentFiles) => currentFiles.map(clearMappedSubject));
    addActivity(
      'project-imported',
      'success',
      `Filled product brief from initial prompt with ${draft.subjects.length} topics.`,
    );
  };

  const handleAddSubject = (name: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      subjects: [...currentProject.subjects, { id: crypto.randomUUID(), name }],
    }));
    addActivity('file-added', 'info', `Added topic ${name}.`);
  };

  const handleRemoveSubject = (subjectId: string) => {
    const subjectName =
      project.subjects.find((subject) => subject.id === subjectId)?.name ?? 'subject';
    updateProject((currentProject) => ({
      ...currentProject,
      subjects: currentProject.subjects.filter((subject) => subject.id !== subjectId),
    }));
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.mappedSubjectId === subjectId ? clearMappedSubject(file) : file,
      ),
    );
    addActivity('file-removed', 'warning', `Removed ${subjectName} and cleared related mappings.`);
  };

  const handleFilesSelected = async (incomingFiles: File[]) => {
    setBusyAction('uploading');

    try {
      const { accepted, duplicates, unsupported } = dedupeIncomingFiles(files, incomingFiles);
      duplicates.forEach((name) =>
        addActivity('file-added', 'warning', `Skipped duplicate file ${name}.`),
      );
      unsupported.forEach((name) =>
        addActivity('file-added', 'warning', `Skipped unsupported file ${name}.`),
      );

      const managedFiles: ManagedFile[] = [];
      for (const file of accepted) {
        try {
          managedFiles.push(await createManagedFile(file, project.subjects));
        } catch (error) {
          addActivity(
            'error',
            'error',
            error instanceof Error ? error.message : `Could not read ${file.name}.`,
          );
        }
      }

      if (managedFiles.length > 0) {
        setFiles((currentFiles) => [...currentFiles, ...managedFiles]);
        addActivity('file-added', 'success', `Added ${managedFiles.length} file(s).`);
      }
    } catch (error) {
      addActivity('error', 'error', error instanceof Error ? error.message : 'File upload failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const updateFile = (fileId: string, updater: (file: ManagedFile) => ManagedFile) => {
    setFiles((currentFiles) =>
      currentFiles.map((file) => (file.id === fileId ? updater(file) : file)),
    );
  };

  const handleApprove = (fileId: string) => {
    updateFile(fileId, (file) => ({
      ...file,
      reviewState: 'approved',
      explicitlyConfirmed: true,
    }));
    updateProject((currentProject) => ({
      ...currentProject,
      lastImageApprovalAt: nowIso(),
    }));
    addActivity('image-approved', 'success', 'Approved image.');
  };

  const handleReject = (fileId: string) => {
    updateFile(fileId, (file) => ({
      ...file,
      reviewState: 'rejected',
    }));
    addActivity('image-rejected', 'warning', 'Rejected image.');
  };

  const handleDelete = (fileId: string) => {
    const file = files.find((item) => item.id === fileId);
    if (file) {
      revokeObjectUrl(file);
    }

    setFiles((currentFiles) => currentFiles.filter((item) => item.id !== fileId));
    addActivity('file-removed', 'warning', `Removed ${file?.name ?? 'file'}.`);
  };

  const handleMap = (fileId: string, subjectId: string | undefined) => {
    updateFile(fileId, (file) => withMappedSubject(file, subjectId));
    const subjectName =
      project.subjects.find((subject) => subject.id === subjectId)?.name ?? 'unmapped';
    addActivity('image-mapped', 'info', `Updated image mapping to ${subjectName}.`);
  };

  const handleNotesChange = (fileId: string, notes: string) => {
    updateFile(fileId, (file) => ({
      ...file,
      reviewNotes: notes,
    }));
  };

  const handleConfirmReview = (fileId: string) => {
    updateFile(fileId, (file) => ({
      ...file,
      explicitlyConfirmed: true,
    }));
    addActivity('notes-updated', 'success', 'Confirmed manual review for image.');
  };

  const handleGenerateSubjectImage = async (subjectId: string) => {
    const prompt = prompts.find((item) => item.subjectId === subjectId);
    if (!prompt) {
      return;
    }

    setBusyAction('image-generation');
    setGeneratingSubjectId(subjectId);

    try {
      const { generateImageWithOpenAI } = await import('./lib/openaiImages');
      const generatedFile = await generateImageWithOpenAI(openAISettings, prompt);
      const uniqueFile = makeUniqueFile(generatedFile, filesRef.current);
      const managedFile = await createManagedFile(uniqueFile, project.subjects);
      const mappedFile: ManagedFile = {
        ...managedFile,
        mappedSubjectId: subjectId,
        reviewNotes: `Generated with OpenAI ${openAISettings.model}. Review before approval.`,
      };
      setFiles((currentFiles) => [...currentFiles, mappedFile]);
      addActivity(
        'image-generated',
        'success',
        `Generated ${getExpectedFilename(prompt.subjectName)}.`,
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error
          ? error.message
          : `Image generation failed for ${prompt.subjectName}.`,
      );
    } finally {
      setGeneratingSubjectId(null);
      setBusyAction(null);
    }
  };

  const handleGenerateMissingSubjectImages = async () => {
    if (missingImagePrompts.length === 0) {
      return;
    }

    setBusyAction('image-generation');

    try {
      const { generateImageWithOpenAI } = await import('./lib/openaiImages');
      const generatedManagedFiles: ManagedFile[] = [];
      let workingFiles = filesRef.current;

      for (const prompt of missingImagePrompts) {
        setGeneratingSubjectId(prompt.subjectId);
        const generatedFile = await generateImageWithOpenAI(openAISettings, prompt);
        const uniqueFile = makeUniqueFile(generatedFile, [
          ...workingFiles,
          ...generatedManagedFiles,
        ]);
        const managedFile = await createManagedFile(uniqueFile, project.subjects);
        const mappedFile: ManagedFile = {
          ...managedFile,
          mappedSubjectId: prompt.subjectId,
          reviewNotes: `Generated with OpenAI ${openAISettings.model}. Review before approval.`,
        };
        generatedManagedFiles.push(mappedFile);
        workingFiles = [...workingFiles, mappedFile];
        addActivity('image-generated', 'success', `Generated image for ${prompt.subjectName}.`);
      }

      if (generatedManagedFiles.length > 0) {
        setFiles((currentFiles) => [...currentFiles, ...generatedManagedFiles]);
      }
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Image generation failed.',
      );
    } finally {
      setGeneratingSubjectId(null);
      setBusyAction(null);
    }
  };

  const handleGeneratePdfs = async () => {
    setBusyAction('pdfs');

    try {
      const approvedFiles = groupFilesForExport(files, project.subjects).approvedMapped;
      if (approvedFiles.length === 0) {
        addActivity(
          'error',
          'warning',
          'Approve and map at least one image before generating PDFs.',
        );
        return;
      }

      const { generatePrintablePdfs } = await import('./lib/pdf');
      const generatedFiles = await generatePrintablePdfs(project, approvedFiles);
      setFiles((currentFiles) => {
        currentFiles.filter((file) => file.kind === 'generated-pdf').forEach(revokeObjectUrl);
        return replaceGeneratedFiles(currentFiles, generatedFiles, 'generated-pdf');
      });
      updateProject((currentProject) => ({
        ...currentProject,
        lastPdfGeneratedAt: nowIso(),
      }));
      addActivity(
        'pdf-generated',
        'success',
        `Generated ${generatedFiles.length} printable PDF(s).`,
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'PDF generation failed.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleGeneratePreviews = async () => {
    setBusyAction('previews');

    try {
      const approvedFiles = groupFilesForExport(files, project.subjects).approvedMapped;
      if (approvedFiles.length === 0) {
        addActivity(
          'error',
          'warning',
          'Approve and map at least one image before generating previews.',
        );
        return;
      }

      const { generateMarketplacePreviewImages } = await import('./lib/previewImages');
      const generatedFiles = await generateMarketplacePreviewImages(project, approvedFiles);
      setFiles((currentFiles) => {
        currentFiles.filter((file) => file.kind === 'generated-preview').forEach(revokeObjectUrl);
        return replaceGeneratedFiles(currentFiles, generatedFiles, 'generated-preview');
      });
      updateProject((currentProject) => ({
        ...currentProject,
        lastPreviewGeneratedAt: nowIso(),
      }));
      addActivity(
        'preview-generated',
        'success',
        `Generated ${generatedFiles.length} preview image(s).`,
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Preview generation failed.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportProjectJson = () => {
    setBusyAction('project-json');

    try {
      const exportedAt = nowIso();
      const nextProject = {
        ...project,
        lastProjectJsonExportAt: exportedAt,
        updatedAt: exportedAt,
      };
      const backup = createProjectBackup(nextProject);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${slugify(project.settings.theme)}_project_backup.json`);
      setProject(nextProject);
      addActivity('project-exported', 'success', 'Exported project JSON metadata backup.');
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Project JSON export failed.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportProjectJson = async (file: File) => {
    setBusyAction('import');

    try {
      const rawJson = await fileToText(file);
      const importedProject = parseProjectBackup(rawJson);
      files.forEach(revokeObjectUrl);
      setFiles([]);
      setProject(importedProject);
      addActivity(
        'project-imported',
        'warning',
        'Imported project metadata. Uploaded files are not part of JSON backups and must be re-uploaded.',
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Project import failed.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportArchive = async () => {
    setBusyAction('archive');

    try {
      const { exportArchive } = await import('./lib/zipExport');
      const result = await exportArchive(project, files);
      const exportedAt = nowIso();
      const nextProject = {
        ...project,
        lastArchiveExportAt: exportedAt,
        nestedEtsyUploadZipSizeBytes: result.nestedEtsyUploadZipSizeBytes,
        updatedAt: exportedAt,
      };
      setProject(nextProject);

      if (result.needsReview) {
        const shouldDownload = window.confirm(
          'This archive is marked needs review. Critical QA checks or Etsy size checks need attention. Download anyway?',
        );
        if (!shouldDownload) {
          addActivity(
            'archive-exported',
            'warning',
            'Archive export was generated but download was cancelled.',
          );
          return;
        }
      }

      downloadBlob(result.blob, result.fileName);
      addActivity(
        'archive-exported',
        result.needsReview ? 'warning' : 'success',
        `Exported ${result.fileName} with app version ${APP_VERSION}.`,
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Archive export failed.',
      );
    } finally {
      setBusyAction(null);
    }
  };

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
          <InitialPromptPanel onApplyDraft={handleApplyInitialDraft} />
          <ProductBriefForm settings={project.settings} onChange={handleSettingsChange} />
          <OpenAIImagePanel
            settings={openAISettings}
            missingImageCount={missingImagePrompts.length}
            busy={busyAction !== null}
            onChange={setOpenAISettings}
            onGenerateMissingImages={handleGenerateMissingSubjectImages}
          />
          <PdfSettingsPanel settings={project.pdfSettings} onChange={handlePdfSettingsChange} />
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
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            onMap={handleMap}
            onNotesChange={handleNotesChange}
            onConfirmReview={handleConfirmReview}
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
            onGeneratePdfs={handleGeneratePdfs}
            onGeneratePreviews={handleGeneratePreviews}
            onExportArchive={handleExportArchive}
            onExportProjectJson={handleExportProjectJson}
            onImportProjectJson={handleImportProjectJson}
          />
          <QAPanel result={qaResult} />
          <HowToUse />
          <ActivityLog items={activityLog} />
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => {
              files.forEach(revokeObjectUrl);
              setFiles([]);
              addActivity('file-removed', 'warning', 'Cleared in-memory files.');
            }}
          >
            Clear uploaded/generated files
          </Button>
        </aside>
      </main>
    </div>
  );
};
