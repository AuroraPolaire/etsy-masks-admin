import { APP_VERSION } from '../constants';
import { nowIso } from '../lib/dates';
import { downloadBlob, fileToText, groupFilesForExport } from '../lib/files';
import { slugify } from '../lib/slugify';
import { createProjectBackup, parseProjectBackup } from '../lib/storage';

import type { AddActivity, ManagedFile, Project, RunBusyAction } from '../types';

type UseExportActionsParams = {
  project: Project;
  files: ManagedFile[];
  updateProject: (updater: (project: Project) => Project) => void;
  replaceProject: (project: Project) => void;
  replaceGeneratedFilesByKind: (
    generatedFiles: ManagedFile[],
    kind: Extract<ManagedFile['kind'], 'generated-pdf' | 'generated-preview'>,
  ) => void;
  clearFiles: () => void;
  addActivity: AddActivity;
  runBusyAction: RunBusyAction;
  confirmAction: (options: {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
};

export const useExportActions = ({
  project,
  files,
  updateProject,
  replaceProject,
  replaceGeneratedFilesByKind,
  clearFiles,
  addActivity,
  runBusyAction,
  confirmAction,
}: UseExportActionsParams) => {
  const generatePdfs = () =>
    runBusyAction('pdfs', async () => {
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

        const { generatePrintablePdfs } = await import('../lib/pdf');
        const generatedFiles = await generatePrintablePdfs(project, approvedFiles);
        replaceGeneratedFilesByKind(generatedFiles, 'generated-pdf');
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
      }
    });

  const generatePreviews = () =>
    runBusyAction('previews', async () => {
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

        const { generateMarketplacePreviewImages } = await import('../lib/previewImages');
        const generatedFiles = await generateMarketplacePreviewImages(project, approvedFiles);
        replaceGeneratedFilesByKind(generatedFiles, 'generated-preview');
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
      }
    });

  const exportProjectJson = () =>
    runBusyAction('project-json', () => {
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
        replaceProject(nextProject);
        addActivity('project-exported', 'success', 'Exported project JSON metadata backup.');
      } catch (error) {
        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Project JSON export failed.',
        );
      }
    });

  const importProjectJson = (file: File) =>
    runBusyAction('import', async () => {
      try {
        const rawJson = await fileToText(file);
        const importedProject = parseProjectBackup(rawJson);
        clearFiles();
        replaceProject(importedProject);
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
      }
    });

  const exportArchive = () =>
    runBusyAction('archive', async () => {
      try {
        const { exportArchive: createArchive } = await import('../lib/zipExport');
        const result = await createArchive(project, files);
        const exportedAt = nowIso();

        updateProject((currentProject) => ({
          ...currentProject,
          lastArchiveExportAt: exportedAt,
          nestedEtsyUploadZipSizeBytes: result.nestedEtsyUploadZipSizeBytes,
        }));

        if (result.needsReview) {
          const shouldDownload = await confirmAction({
            title: 'Download archive marked needs review?',
            description:
              'Critical QA checks or Etsy size checks still need attention. The ZIP can be downloaded for inspection, but it should not be uploaded to Etsy until the blockers are resolved.',
            confirmLabel: 'Download anyway',
          });
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
      }
    });

  return {
    generatePdfs,
    generatePreviews,
    exportProjectJson,
    importProjectJson,
    exportArchive,
  };
};
