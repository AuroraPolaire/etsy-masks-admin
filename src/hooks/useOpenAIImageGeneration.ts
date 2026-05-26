import { useCallback, useState } from 'react';

import { makeUniqueFile, makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import { createManagedFile, getExpectedFilename } from '../lib/files';

import type {
  AddActivity,
  BusyActionContext,
  ManagedFile,
  OpenAIImageSettings,
  PromptItem,
  SubjectItem,
} from '../types';
import type { MutableRefObject } from 'react';

const MAX_PARALLEL_IMAGE_GENERATIONS = 3;

type UseOpenAIImageGenerationParams = {
  subjects: SubjectItem[];
  prompts: PromptItem[];
  missingImagePrompts: PromptItem[];
  settings: OpenAIImageSettings;
  filesRef: MutableRefObject<ManagedFile[]>;
  appendFiles: (files: ManagedFile[]) => void;
  addActivity: AddActivity;
  onSettingsChange: (settings: OpenAIImageSettings) => void;
  generateImageFile: (
    settings: OpenAIImageSettings,
    prompt: PromptItem,
    signal?: AbortSignal,
  ) => Promise<File>;
};

const createGeneratedManagedFile = async (
  generatedFile: File,
  prompt: PromptItem,
  settings: OpenAIImageSettings,
  subjects: SubjectItem[],
): Promise<ManagedFile> => {
  const managedFile = await createManagedFile(generatedFile, subjects);

  return {
    ...managedFile,
    mappedSubjectId: prompt.subjectId,
    reviewNotes: `Generated with OpenAI ${settings.model}. Review before approving.`,
  };
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const useOpenAIImageGeneration = ({
  subjects,
  prompts,
  missingImagePrompts,
  settings,
  filesRef,
  appendFiles,
  addActivity,
  onSettingsChange,
  generateImageFile,
}: UseOpenAIImageGenerationParams) => {
  const [generatingSubjectIds, setGeneratingSubjectIds] = useState<string[]>([]);

  const startGeneratingSubject = useCallback((subjectId: string) => {
    setGeneratingSubjectIds((currentIds) =>
      currentIds.includes(subjectId) ? currentIds : [...currentIds, subjectId],
    );
  }, []);

  const finishGeneratingSubject = useCallback((subjectId: string) => {
    setGeneratingSubjectIds((currentIds) => currentIds.filter((id) => id !== subjectId));
  }, []);

  const generateSubjectImage = useCallback(
    async (subjectId: string, context?: BusyActionContext) => {
      const prompt = prompts.find((item) => item.subjectId === subjectId);
      if (!prompt) {
        return;
      }

      startGeneratingSubject(subjectId);
      context?.setProgress(`Generating ${prompt.subjectName}...`);

      try {
        const generatedFile = await generateImageFile(settings, prompt, context?.signal);
        if (context?.signal.aborted) {
          return;
        }
        const uniqueFile = makeUniqueFile(generatedFile, filesRef.current);
        const mappedFile = await createGeneratedManagedFile(uniqueFile, prompt, settings, subjects);

        appendFiles([mappedFile]);
        addActivity(
          'image-generated',
          'success',
          `Generated ${getExpectedFilename(prompt.subjectName)}.`,
        );
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('image-generated', 'warning', 'Image generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : `Could not generate ${prompt.subjectName}.`,
        );
      } finally {
        finishGeneratingSubject(subjectId);
      }
    },
    [
      addActivity,
      appendFiles,
      filesRef,
      finishGeneratingSubject,
      generateImageFile,
      prompts,
      settings,
      startGeneratingSubject,
      subjects,
    ],
  );

  const generateMissingSubjectImages = useCallback(
    async (context?: BusyActionContext) => {
      if (missingImagePrompts.length === 0) {
        return;
      }

      try {
        const reservedNames = new Set(filesRef.current.map((file) => file.name.toLowerCase()));
        let nextPromptIndex = 0;
        let completedCount = 0;
        let failedCount = 0;
        let cancelled = false;
        const concurrency = Math.min(MAX_PARALLEL_IMAGE_GENERATIONS, missingImagePrompts.length);

        const generatePrompt = async (prompt: PromptItem, promptIndex: number) => {
          if (context?.signal.aborted) {
            cancelled = true;
            return;
          }

          startGeneratingSubject(prompt.subjectId);
          context?.setProgress(
            `Generating ${promptIndex + 1}/${missingImagePrompts.length}: ${
              prompt.subjectName
            } (${concurrency} at a time)...`,
          );

          try {
            const generatedFile = await generateImageFile(settings, prompt, context?.signal);
            if (context?.signal.aborted) {
              cancelled = true;
              return;
            }

            const uniqueFile = makeUniqueFileWithReservedNames(generatedFile, reservedNames);
            const mappedFile = await createGeneratedManagedFile(
              uniqueFile,
              prompt,
              settings,
              subjects,
            );

            appendFiles([mappedFile]);
            completedCount += 1;
            addActivity('image-generated', 'success', `Generated ${prompt.subjectName}.`);
            context?.setProgress(
              `Generated ${completedCount}/${missingImagePrompts.length} image${
                completedCount === 1 ? '' : 's'
              }${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
            );
          } catch (error) {
            if (isAbortError(error)) {
              cancelled = true;
              return;
            }

            failedCount += 1;
            addActivity(
              'error',
              'error',
              error instanceof Error ? error.message : `Could not generate ${prompt.subjectName}.`,
            );
          } finally {
            finishGeneratingSubject(prompt.subjectId);
          }
        };

        const worker = async () => {
          while (nextPromptIndex < missingImagePrompts.length && !context?.signal.aborted) {
            const promptIndex = nextPromptIndex;
            nextPromptIndex += 1;
            const prompt = missingImagePrompts[promptIndex];
            if (prompt) {
              await generatePrompt(prompt, promptIndex);
            }
          }
        };

        await Promise.all(Array.from({ length: concurrency }, worker));

        if (cancelled || context?.signal.aborted) {
          addActivity('image-generated', 'warning', 'Image generation was cancelled.');
        }
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('image-generated', 'warning', 'Image generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate images.',
        );
      }
    },
    [
      addActivity,
      appendFiles,
      filesRef,
      finishGeneratingSubject,
      generateImageFile,
      missingImagePrompts,
      settings,
      startGeneratingSubject,
      subjects,
    ],
  );

  return {
    openAISettings: settings,
    setOpenAISettings: onSettingsChange,
    generatingSubjectIds,
    generateSubjectImage,
    generateMissingSubjectImages,
  };
};
