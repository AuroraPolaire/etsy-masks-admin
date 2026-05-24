import { useCallback, useState } from 'react';

import { DEFAULT_OPENAI_IMAGE_SETTINGS } from '../constants';
import { makeUniqueFile } from '../lib/fileLifecycle';
import { createManagedFile, getExpectedFilename } from '../lib/files';

import type {
  AddActivity,
  ManagedFile,
  OpenAIImageSettings,
  PromptItem,
  SubjectItem,
} from '../types';
import type { MutableRefObject } from 'react';

type UseOpenAIImageGenerationParams = {
  subjects: SubjectItem[];
  prompts: PromptItem[];
  missingImagePrompts: PromptItem[];
  filesRef: MutableRefObject<ManagedFile[]>;
  appendFiles: (files: ManagedFile[]) => void;
  addActivity: AddActivity;
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
    reviewNotes: `Generated with OpenAI ${settings.model}. Review before approval.`,
  };
};

export const useOpenAIImageGeneration = ({
  subjects,
  prompts,
  missingImagePrompts,
  filesRef,
  appendFiles,
  addActivity,
}: UseOpenAIImageGenerationParams) => {
  const [settings, setSettings] = useState<OpenAIImageSettings>(DEFAULT_OPENAI_IMAGE_SETTINGS);
  const [generatingSubjectId, setGeneratingSubjectId] = useState<string | null>(null);

  const generateSubjectImage = useCallback(
    async (subjectId: string) => {
      const prompt = prompts.find((item) => item.subjectId === subjectId);
      if (!prompt) {
        return;
      }

      setGeneratingSubjectId(subjectId);

      try {
        const { generateImageWithOpenAI } = await import('../lib/openaiImages');
        const generatedFile = await generateImageWithOpenAI(settings, prompt);
        const uniqueFile = makeUniqueFile(generatedFile, filesRef.current);
        const mappedFile = await createGeneratedManagedFile(uniqueFile, prompt, settings, subjects);

        appendFiles([mappedFile]);
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
      }
    },
    [addActivity, appendFiles, filesRef, prompts, settings, subjects],
  );

  const generateMissingSubjectImages = useCallback(async () => {
    if (missingImagePrompts.length === 0) {
      return;
    }

    try {
      const { generateImageWithOpenAI } = await import('../lib/openaiImages');
      const generatedManagedFiles: ManagedFile[] = [];
      let workingFiles = filesRef.current;

      for (const prompt of missingImagePrompts) {
        setGeneratingSubjectId(prompt.subjectId);
        const generatedFile = await generateImageWithOpenAI(settings, prompt);
        const uniqueFile = makeUniqueFile(generatedFile, [
          ...workingFiles,
          ...generatedManagedFiles,
        ]);
        const mappedFile = await createGeneratedManagedFile(uniqueFile, prompt, settings, subjects);

        generatedManagedFiles.push(mappedFile);
        workingFiles = [...workingFiles, mappedFile];
        addActivity('image-generated', 'success', `Generated image for ${prompt.subjectName}.`);
      }

      if (generatedManagedFiles.length > 0) {
        appendFiles(generatedManagedFiles);
      }
    } catch (error) {
      addActivity(
        'error',
        'error',
        error instanceof Error ? error.message : 'Image generation failed.',
      );
    } finally {
      setGeneratingSubjectId(null);
    }
  }, [addActivity, appendFiles, filesRef, missingImagePrompts, settings, subjects]);

  return {
    openAISettings: settings,
    setOpenAISettings: setSettings,
    generatingSubjectId,
    generateSubjectImage,
    generateMissingSubjectImages,
  };
};
