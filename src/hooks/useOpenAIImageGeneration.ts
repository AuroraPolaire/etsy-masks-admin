import { useCallback, useState } from 'react';

import { makeUniqueFile, makeUniqueFileWithReservedNames } from '../lib/fileLifecycle';
import {
  createManagedFile,
  getColoringPageFilename,
  getCurrentColoringPageForSubject,
  getExpectedFilename,
  getFileForSubject,
} from '../lib/files';

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
  appendGeneratedFiles: (files: ManagedFile[], context?: BusyActionContext) => Promise<void>;
  addActivity: AddActivity;
  onSettingsChange: (settings: OpenAIImageSettings) => void;
  generateImageFile: (
    settings: OpenAIImageSettings,
    prompt: PromptItem,
    signal?: AbortSignal,
  ) => Promise<File>;
  generateColoringPageFile: (
    settings: OpenAIImageSettings,
    prompt: PromptItem,
    sourceFile: File,
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

const createGeneratedColoringPageFile = async (
  generatedFile: File,
  prompt: PromptItem,
  settings: OpenAIImageSettings,
  subjects: SubjectItem[],
  sourceFileId: string,
): Promise<ManagedFile> => {
  const managedFile = await createManagedFile(generatedFile, subjects);

  return {
    ...managedFile,
    mappedSubjectId: prompt.subjectId,
    assetVariant: 'coloring-page',
    sourceFileId,
    reviewState: 'approved',
    explicitlyConfirmed: true,
    reviewNotes: `Generated coloring page with OpenAI ${settings.model}.`,
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
  appendGeneratedFiles,
  addActivity,
  onSettingsChange,
  generateImageFile,
  generateColoringPageFile,
}: UseOpenAIImageGenerationParams) => {
  const [generatingSubjectIds, setGeneratingSubjectIds] = useState<string[]>([]);
  const [generatingColoringPageSubjectIds, setGeneratingColoringPageSubjectIds] = useState<
    string[]
  >([]);

  const startGeneratingSubject = useCallback((subjectId: string) => {
    setGeneratingSubjectIds((currentIds) =>
      currentIds.includes(subjectId) ? currentIds : [...currentIds, subjectId],
    );
  }, []);

  const finishGeneratingSubject = useCallback((subjectId: string) => {
    setGeneratingSubjectIds((currentIds) => currentIds.filter((id) => id !== subjectId));
  }, []);

  const startGeneratingColoringPage = useCallback((subjectId: string) => {
    setGeneratingColoringPageSubjectIds((currentIds) =>
      currentIds.includes(subjectId) ? currentIds : [...currentIds, subjectId],
    );
  }, []);

  const finishGeneratingColoringPage = useCallback((subjectId: string) => {
    setGeneratingColoringPageSubjectIds((currentIds) =>
      currentIds.filter((id) => id !== subjectId),
    );
  }, []);

  const generateSubjectImage = useCallback(
    async (subjectId: string, context?: BusyActionContext, promptOverride?: string) => {
      const prompt = prompts.find((item) => item.subjectId === subjectId);
      if (!prompt) {
        return;
      }
      const requestPrompt =
        promptOverride?.trim() && promptOverride.trim() !== prompt.prompt
          ? { ...prompt, prompt: promptOverride.trim() }
          : prompt;

      startGeneratingSubject(subjectId);
      context?.setProgress(`Generating ${prompt.subjectName}...`);

      try {
        const generatedFile = await generateImageFile(settings, requestPrompt, context?.signal);
        if (context?.signal.aborted) {
          return;
        }
        const uniqueFile = makeUniqueFile(generatedFile, filesRef.current);
        const mappedFile = await createGeneratedManagedFile(
          uniqueFile,
          requestPrompt,
          settings,
          subjects,
        );

        await appendGeneratedFiles([mappedFile], context);
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
      appendGeneratedFiles,
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

            await appendGeneratedFiles([mappedFile], context);
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
      appendGeneratedFiles,
      filesRef,
      finishGeneratingSubject,
      generateImageFile,
      missingImagePrompts,
      settings,
      startGeneratingSubject,
      subjects,
    ],
  );

  const generateColoringPageFromSourceFile = useCallback(
    async (sourceFile: ManagedFile, context?: BusyActionContext) => {
      const subjectId = sourceFile.mappedSubjectId;
      const prompt = subjectId ? prompts.find((item) => item.subjectId === subjectId) : undefined;
      if (!prompt || !subjectId) {
        return;
      }

      startGeneratingColoringPage(prompt.subjectId);
      context?.setProgress(`Generating coloring page for ${prompt.subjectName}...`);

      try {
        const coloringPageSettings = {
          ...settings,
          size: settings.coloringPageSize,
          quality: 'low' as const,
        };
        const generatedFile = await generateColoringPageFile(
          coloringPageSettings,
          prompt,
          sourceFile.file,
          context?.signal,
        );
        if (context?.signal.aborted) {
          return;
        }

        const reservedNames = new Set(filesRef.current.map((file) => file.name.toLowerCase()));
        const namedFile = new File([generatedFile], getColoringPageFilename(prompt.subjectName), {
          type: generatedFile.type || 'image/png',
        });
        const uniqueFile = makeUniqueFileWithReservedNames(namedFile, reservedNames);
        const mappedFile = await createGeneratedColoringPageFile(
          uniqueFile,
          prompt,
          settings,
          subjects,
          sourceFile.id,
        );

        await appendGeneratedFiles([mappedFile], context);
        addActivity('image-generated', 'success', `Generated ${mappedFile.name}.`);
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('image-generated', 'warning', 'Coloring page generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : `Could not generate ${prompt.subjectName}.`,
        );
      } finally {
        finishGeneratingColoringPage(prompt.subjectId);
      }
    },
    [
      addActivity,
      appendGeneratedFiles,
      filesRef,
      finishGeneratingColoringPage,
      generateColoringPageFile,
      prompts,
      settings,
      startGeneratingColoringPage,
      subjects,
    ],
  );

  const generateSubjectColoringPage = useCallback(
    async (subjectId: string, context?: BusyActionContext) => {
      const sourceFile = getFileForSubject(filesRef.current, subjectId);
      if (!sourceFile) {
        return;
      }

      await generateColoringPageFromSourceFile(sourceFile, context);
    },
    [filesRef, generateColoringPageFromSourceFile],
  );

  const generateMissingColoringPages = useCallback(
    async (context?: BusyActionContext) => {
      const promptsNeedingColoringPages = prompts.filter((prompt) => {
        const approvedColor = getFileForSubject(filesRef.current, prompt.subjectId);
        const approvedColoringPage = approvedColor
          ? getCurrentColoringPageForSubject(filesRef.current, prompt.subjectId, approvedColor)
          : undefined;

        return approvedColor && !approvedColoringPage;
      });

      if (promptsNeedingColoringPages.length === 0) {
        return;
      }

      try {
        for (const [index, prompt] of promptsNeedingColoringPages.entries()) {
          if (context?.signal.aborted) {
            throw new DOMException('Coloring page generation cancelled', 'AbortError');
          }

          context?.setProgress(
            `Generating coloring page ${index + 1}/${promptsNeedingColoringPages.length}: ${
              prompt.subjectName
            }...`,
          );
          await generateSubjectColoringPage(prompt.subjectId, context);
        }
      } catch (error) {
        if (isAbortError(error)) {
          addActivity('image-generated', 'warning', 'Coloring page generation was cancelled.');
          return;
        }

        addActivity(
          'error',
          'error',
          error instanceof Error ? error.message : 'Could not generate coloring pages.',
        );
      }
    },
    [addActivity, filesRef, generateSubjectColoringPage, prompts],
  );

  return {
    openAISettings: settings,
    setOpenAISettings: onSettingsChange,
    generatingSubjectIds,
    generatingColoringPageSubjectIds,
    generateSubjectImage,
    generateMissingSubjectImages,
    generateColoringPageFromSourceFile,
    generateSubjectColoringPage,
    generateMissingColoringPages,
  };
};
