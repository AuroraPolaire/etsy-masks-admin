import { APP_VERSION } from '../constants';
import { nowIso } from '../lib/dates';
import { downloadBlob, fileToText } from '../lib/files';
import { slugify } from '../lib/slugify';
import { createProjectBackup, parseProjectBackup } from '../lib/storage';

import type { AddActivity, BusyActionContext, ManagedFile, Project, RunBusyAction } from '../types';

type UseExportActionsParams = {
  project: Project;
  files: ManagedFile[];
  replaceProject: (project: Project) => void;
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

const throwIfAborted = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new DOMException('Action cancelled', 'AbortError');
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const useExportActions = ({
  project,
  files,
  replaceProject,
  clearFiles,
  addActivity,
  runBusyAction,
  confirmAction,
}: UseExportActionsParams) => {
  const exportProjectJson = () =>
    runBusyAction('project-json', ({ setProgress, signal }) => {
      try {
        setProgress('Preparing project metadata JSON...');
        throwIfAborted(signal);
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
        addActivity('project-exported', 'success', 'Exported project metadata JSON.');
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('project-exported', 'warning', 'Project JSON export was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not export project JSON.',
        );
      }
    });

  const importProjectJson = (file: File) =>
    runBusyAction('import', async ({ setProgress, signal }) => {
      try {
        setProgress('Reading project metadata JSON...');
        const rawJson = await fileToText(file);
        throwIfAborted(signal);
        const importedProject = parseProjectBackup(rawJson);
        clearFiles();
        replaceProject(importedProject);
        addActivity(
          'project-imported',
          'warning',
          'Imported project metadata. Restore a cloud run or regenerate assets because JSON backups do not include files.',
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('project-imported', 'warning', 'Project JSON import was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not import project JSON.',
        );
      }
    });

  const exportArchive = () =>
    runBusyAction('archive', async ({ setProgress, signal }: BusyActionContext) => {
      try {
        setProgress('Creating PNG and listing PDF ZIP...');
        const { exportArchive: createArchive } = await import('../lib/zipExport');
        const result = await createArchive(project, files);
        const exportedAt = nowIso();
        const exportedProject = {
          ...project,
          lastArchiveExportAt: exportedAt,
          nestedEtsyUploadZipSizeBytes: result.nestedEtsyUploadZipSizeBytes,
          updatedAt: exportedAt,
        };
        throwIfAborted(signal);

        replaceProject(exportedProject);

        setProgress('Checking QA blockers before download...');
        if (result.needsReview) {
          const shouldDownload = await confirmAction({
            title: 'Download ZIP with open blockers?',
            description:
              'Some QA or Etsy size checks still need fixes. Download for inspection, but resolve blockers before uploading to Etsy.',
            confirmLabel: 'Download anyway',
          });
          if (!shouldDownload) {
            addActivity(
              'archive-exported',
              'warning',
              'ZIP was created, but the download was cancelled.',
            );
            return;
          }
        }

        throwIfAborted(signal);
        setProgress('Starting ZIP download...');
        downloadBlob(result.blob, result.fileName);
        addActivity(
          'archive-exported',
          result.needsReview ? 'warning' : 'success',
          `Exported ${result.fileName} with app version ${APP_VERSION}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('archive-exported', 'warning', 'Archive export was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not export the ZIP.',
        );
      }
    });

  return {
    exportProjectJson,
    importProjectJson,
    exportArchive,
  };
};
