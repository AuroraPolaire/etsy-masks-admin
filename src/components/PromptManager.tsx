import { CheckCheck } from 'lucide-react';
import { useState } from 'react';

import { PromptCard } from './prompts/PromptCard';
import { getFileForSubject } from '../lib/files';
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
  missingImageCount?: number;
  imageGenerationHint?: string;
  allowTopicEditing?: boolean;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onGenerateMissingImages?: () => void;
  onApproveAll: (fileIds: string[]) => void;
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onCopy: (label: string) => void;
};

export const PromptManager = ({
  subjects,
  prompts,
  files,
  canGenerateImages,
  generatingSubjectIds,
  missingImageCount = 0,
  imageGenerationHint,
  allowTopicEditing = true,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onGenerateMissingImages,
  onApproveAll,
  onApprove,
  onReject,
  onDelete,
  onNotesChange,
  onCopy,
}: PromptManagerProps) => {
  const [subjectName, setSubjectName] = useState('');
  const filesReadyForApproval = prompts
    .map(
      (prompt) =>
        getFileForSubject(files, prompt.subjectId, 'pending') ??
        getFileForSubject(files, prompt.subjectId, 'rejected'),
    )
    .filter((file): file is ManagedFile => Boolean(file));
  const fileIdsReadyForApproval = [...new Set(filesReadyForApproval.map((file) => file.id))];
  const isGeneratingImages = generatingSubjectIds.length > 0;

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
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">AI image prompts</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Generate, copy, and review one image per topic.
            </p>
          </div>
          {!allowTopicEditing && prompts.length > 0 ? (
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap gap-2 md:justify-end">
                <AIButton
                  disabled={
                    !onGenerateMissingImages ||
                    !canGenerateImages ||
                    missingImageCount === 0 ||
                    isGeneratingImages
                  }
                  onClick={onGenerateMissingImages}
                >
                  {isGeneratingImages
                    ? `Generating ${generatingSubjectIds.length}`
                    : 'Generate missing images'}
                </AIButton>
                <Button
                  disabled={fileIdsReadyForApproval.length === 0}
                  onClick={() => onApproveAll(fileIdsReadyForApproval)}
                >
                  <CheckCheck aria-hidden="true" className="mr-2" size={17} />
                  Approve all
                </Button>
              </div>
              <p className="max-w-sm text-sm text-ink-muted md:text-right">
                {imageGenerationHint ??
                  `${missingImageCount} topic${missingImageCount === 1 ? '' : 's'} still need an approved image.`}
              </p>
            </div>
          ) : null}
          {allowTopicEditing ? (
            <div className="flex w-full gap-2 md:w-auto">
              <Input
                label="Add topic"
                name="addSubject"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addSubject();
                  }
                }}
              />
              <Button className="self-end" variant="primary" onClick={addSubject}>
                Add
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardBody>
        {prompts.length === 0 ? (
          <EmptyState>Add topics before generating image prompts.</EmptyState>
        ) : (
          <div className="grid gap-4 2xl:grid-cols-2">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.subjectId}
                prompt={prompt}
                subjects={subjects}
                files={files}
                canGenerateImages={canGenerateImages}
                generatingSubjectIds={generatingSubjectIds}
                allowTopicEditing={allowTopicEditing}
                onRemoveSubject={onRemoveSubject}
                onGenerateImage={onGenerateImage}
                onApprove={onApprove}
                onReject={onReject}
                onDelete={onDelete}
                onNotesChange={onNotesChange}
                onCopy={onCopy}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
