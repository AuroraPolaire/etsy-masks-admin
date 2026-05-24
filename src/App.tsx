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
  getFileForAnimal,
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
  AnimalItem,
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

const clearMappedAnimal = (file: ManagedFile): ManagedFile => {
  const nextFile = { ...file };
  delete nextFile.mappedAnimalId;
  return nextFile;
};

const withMappedAnimal = (file: ManagedFile, animalId: string | undefined): ManagedFile => {
  if (!animalId) {
    return clearMappedAnimal(file);
  }

  return {
    ...file,
    mappedAnimalId: animalId,
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
  const [generatingAnimalId, setGeneratingAnimalId] = useState<string | null>(null);
  const [openAISettings, setOpenAISettings] = useState<OpenAIImageSettings>(
    DEFAULT_OPENAI_IMAGE_SETTINGS,
  );
  const browserSupport = useMemo(() => checkBrowserSupport(), []);
  const prompts = useMemo(() => createPromptItems(project.animals), [project.animals]);
  const qaResult = useMemo(() => runQA(project, files), [project, files]);
  const missingImagePrompts = useMemo(
    () => prompts.filter((prompt) => !getFileForAnimal(files, prompt.animalId)),
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

  const handleApplyInitialDraft = (draft: { settings: ProjectSettings; animals: AnimalItem[] }) => {
    if (files.length > 0) {
      const shouldApply = window.confirm(
        'Applying a new initial prompt replaces the animal list and clears existing image mappings. Continue?',
      );
      if (!shouldApply) {
        return;
      }
    }

    updateProject((currentProject) => ({
      ...currentProject,
      settings: draft.settings,
      animals: draft.animals,
    }));
    setFiles((currentFiles) => currentFiles.map(clearMappedAnimal));
    addActivity(
      'project-imported',
      'success',
      `Filled product brief from initial prompt with ${draft.animals.length} animals.`,
    );
  };

  const handleAddAnimal = (name: string) => {
    updateProject((currentProject) => ({
      ...currentProject,
      animals: [...currentProject.animals, { id: crypto.randomUUID(), name }],
    }));
    addActivity('file-added', 'info', `Added animal ${name}.`);
  };

  const handleRemoveAnimal = (animalId: string) => {
    const animalName = project.animals.find((animal) => animal.id === animalId)?.name ?? 'animal';
    updateProject((currentProject) => ({
      ...currentProject,
      animals: currentProject.animals.filter((animal) => animal.id !== animalId),
    }));
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.mappedAnimalId === animalId ? clearMappedAnimal(file) : file,
      ),
    );
    addActivity('file-removed', 'warning', `Removed ${animalName} and cleared related mappings.`);
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
          managedFiles.push(await createManagedFile(file, project.animals));
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

  const handleMap = (fileId: string, animalId: string | undefined) => {
    updateFile(fileId, (file) => withMappedAnimal(file, animalId));
    const animalName = project.animals.find((animal) => animal.id === animalId)?.name ?? 'unmapped';
    addActivity('image-mapped', 'info', `Updated image mapping to ${animalName}.`);
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

  const handleGenerateImage = async (animalId: string) => {
    const prompt = prompts.find((item) => item.animalId === animalId);
    if (!prompt) {
      return;
    }

    setBusyAction('image-generation');
    setGeneratingAnimalId(animalId);

    try {
      const { generateImageWithOpenAI } = await import('./lib/openaiImages');
      const generatedFile = await generateImageWithOpenAI(openAISettings, prompt);
      const uniqueFile = makeUniqueFile(generatedFile, filesRef.current);
      const managedFile = await createManagedFile(uniqueFile, project.animals);
      const mappedFile: ManagedFile = {
        ...managedFile,
        mappedAnimalId: animalId,
        reviewNotes: `Generated with OpenAI ${openAISettings.model}. Review before approval.`,
      };
      setFiles((currentFiles) => [...currentFiles, mappedFile]);
      addActivity(
        'image-generated',
        'success',
        `Generated ${getExpectedFilename(prompt.animalName)}.`,
      );
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error
          ? error.message
          : `Image generation failed for ${prompt.animalName}.`,
      );
    } finally {
      setGeneratingAnimalId(null);
      setBusyAction(null);
    }
  };

  const handleGenerateMissingImages = async () => {
    if (missingImagePrompts.length === 0) {
      return;
    }

    setBusyAction('image-generation');

    try {
      const { generateImageWithOpenAI } = await import('./lib/openaiImages');
      const generatedManagedFiles: ManagedFile[] = [];
      let workingFiles = filesRef.current;

      for (const prompt of missingImagePrompts) {
        setGeneratingAnimalId(prompt.animalId);
        const generatedFile = await generateImageWithOpenAI(openAISettings, prompt);
        const uniqueFile = makeUniqueFile(generatedFile, [
          ...workingFiles,
          ...generatedManagedFiles,
        ]);
        const managedFile = await createManagedFile(uniqueFile, project.animals);
        const mappedFile: ManagedFile = {
          ...managedFile,
          mappedAnimalId: prompt.animalId,
          reviewNotes: `Generated with OpenAI ${openAISettings.model}. Review before approval.`,
        };
        generatedManagedFiles.push(mappedFile);
        workingFiles = [...workingFiles, mappedFile];
        addActivity('image-generated', 'success', `Generated image for ${prompt.animalName}.`);
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
      setGeneratingAnimalId(null);
      setBusyAction(null);
    }
  };

  const handleGeneratePdfs = async () => {
    setBusyAction('pdfs');

    try {
      const approvedFiles = groupFilesForExport(files, project.animals).approvedMapped;
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
      const approvedFiles = groupFilesForExport(files, project.animals).approvedMapped;
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
    <div className="min-h-screen bg-slate-100">
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
            onGenerateMissingImages={handleGenerateMissingImages}
          />
          <PdfSettingsPanel settings={project.pdfSettings} onChange={handlePdfSettingsChange} />
          <PromptManager
            animals={project.animals}
            prompts={prompts}
            files={files}
            canGenerateImages={openAISettings.apiKey.trim().length > 0 && busyAction === null}
            generatingAnimalId={generatingAnimalId}
            onAddAnimal={handleAddAnimal}
            onRemoveAnimal={handleRemoveAnimal}
            onGenerateImage={handleGenerateImage}
            onCopy={(message) => addActivity('notes-updated', 'success', message)}
          />
          <FileUploader onFilesSelected={handleFilesSelected} disabled={busyAction !== null} />
          <FileReviewGrid
            files={files}
            animals={project.animals}
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
