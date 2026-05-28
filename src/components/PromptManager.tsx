import { FilePenLine } from 'lucide-react';
import { useState } from 'react';
import { PhotoProvider } from 'react-photo-view';

import { getCurrentColoringPageForSubject, getFileForSubject } from '../lib/files';
import { PromptCard } from './prompts/PromptCard';
import { AIButton } from './ui/AIButton';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Input } from './ui/Input';

import type { SubjectItem, ManagedFile, PromptItem } from '../types';

type PromptManagerProps = {
  subjects: SubjectItem[];
  prompts: PromptItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingSubjectIds: string[];
  generatingColoringPageSubjectIds: string[];
  missingImageCount?: number;
  missingColoringPageCount?: number;
  imageGenerationHint?: string;
  allowTopicEditing?: boolean;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string, promptOverride?: string) => void;
  onGenerateMissingImages?: () => void;
  onGenerateColoringPage: (subjectId: string) => void;
  onGenerateMissingColoringPages?: () => void;
  onDelete: (fileId: string) => void;
  onCopy: (label: string) => void;
};

export const PromptManager = ({
  subjects,
  prompts,
  files,
  canGenerateImages,
  generatingSubjectIds,
  generatingColoringPageSubjectIds,
  missingImageCount = 0,
  missingColoringPageCount = 0,
  imageGenerationHint,
  allowTopicEditing = true,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onGenerateMissingImages,
  onGenerateColoringPage,
  onGenerateMissingColoringPages,
  onDelete,
  onCopy,
}: PromptManagerProps) => {
  const [subjectName, setSubjectName] = useState('');
  const isGeneratingImages =
    generatingSubjectIds.length > 0 || generatingColoringPageSubjectIds.length > 0;
  const promptStates = prompts.map((prompt) => {
    const colorFile = getFileForSubject(files, prompt.subjectId);
    const coloringPageFile = colorFile
      ? getCurrentColoringPageForSubject(files, prompt.subjectId, colorFile)
      : undefined;

    return {
      prompt,
      colorFile,
      coloringPageFile,
      complete: Boolean(colorFile && coloringPageFile),
    };
  });
  const completeCount = promptStates.filter((item) => item.complete).length;
  const needsWorkCount = promptStates.length - completeCount;

  const addSubject = () => {
    const trimmedName = subjectName.trim();
    if (!trimmedName) {
      return;
    }

    onAddSubject(trimmedName);
    setSubjectName('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Topics and AI images</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Add mask topics, generate color masks, and review matching coloring pages.
              </p>
            </div>
            {prompts.length > 0 ? (
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <AIButton
                    disabled={
                      !onGenerateMissingImages || !canGenerateImages || missingImageCount === 0
                    }
                    onClick={onGenerateMissingImages}
                  >
                    {isGeneratingImages ? 'Queue missing images' : 'Generate missing images'}
                  </AIButton>
                  <Button
                    disabled={
                      !onGenerateMissingColoringPages ||
                      !canGenerateImages ||
                      missingColoringPageCount === 0
                    }
                    onClick={onGenerateMissingColoringPages}
                  >
                    <FilePenLine aria-hidden="true" className="mr-2" size={17} />
                    {isGeneratingImages ? 'Queue coloring pages' : 'Missing coloring pages'}
                  </Button>
                </div>
                <p className="max-w-sm text-sm text-ink-muted lg:text-right">
                  {imageGenerationHint ??
                    `${missingImageCount} topic${missingImageCount === 1 ? '' : 's'} still need a color mask.`}
                </p>
              </div>
            ) : null}
          </div>
          {allowTopicEditing ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Add mask topic"
                  name="addSubject"
                  value={subjectName}
                  placeholder="Lion, robot, butterfly"
                  onChange={(event) => setSubjectName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addSubject();
                    }
                  }}
                />
              </div>
              <Button className="sm:self-end" variant="primary" onClick={addSubject}>
                Add topic
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardBody>
        {prompts.length === 0 ? (
          <EmptyState>Add mask topics here to generate image prompts.</EmptyState>
        ) : (
          <PhotoProvider>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-muted">
                {needsWorkCount === 0
                  ? 'All topics are complete.'
                  : `${needsWorkCount} topic${needsWorkCount === 1 ? '' : 's'} need attention.`}
              </p>
              <p className="text-sm text-ink-muted">
                {completeCount}/{promptStates.length} complete
              </p>
            </div>
            <div className="grid gap-4">
              {promptStates.map(({ prompt }) => (
                <PromptCard
                  key={prompt.subjectId}
                  prompt={prompt}
                  subjects={subjects}
                  files={files}
                  canGenerateImages={canGenerateImages}
                  generatingSubjectIds={generatingSubjectIds}
                  generatingColoringPageSubjectIds={generatingColoringPageSubjectIds}
                  allowTopicEditing={allowTopicEditing}
                  onRemoveSubject={onRemoveSubject}
                  onGenerateImage={onGenerateImage}
                  onGenerateColoringPage={onGenerateColoringPage}
                  onDelete={onDelete}
                  onCopy={onCopy}
                />
              ))}
            </div>
          </PhotoProvider>
        )}
      </CardBody>
    </Card>
  );
};
