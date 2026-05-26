import { CheckCheck, FilePenLine, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PhotoProvider } from 'react-photo-view';

import { PromptCard } from './prompts/PromptCard';
import { getCurrentColoringPageForSubject, getFileForSubject } from '../lib/files';
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
  onApproveAll: (fileIds: string[]) => void;
  onApprove: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onCopy: (label: string) => void;
};

const PhotoPreviewControls = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <button
      type="button"
      className="inline-flex size-11 items-center justify-center border-0 bg-transparent text-white opacity-75 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/60"
      aria-label="Close image preview"
      onClick={() => onClose()}
    >
      <X aria-hidden="true" size={22} />
    </button>
  );
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
  onApproveAll,
  onApprove,
  onDelete,
  onCopy,
}: PromptManagerProps) => {
  const [subjectName, setSubjectName] = useState('');
  const filesReadyForApproval = prompts
    .flatMap((prompt) => {
      const colorFile = getFileForSubject(files, prompt.subjectId, 'pending');
      const approvedColorFile = getFileForSubject(files, prompt.subjectId);
      const coloringPageFile = approvedColorFile
        ? getCurrentColoringPageForSubject(files, prompt.subjectId, approvedColorFile, 'pending')
        : undefined;

      return [colorFile, coloringPageFile];
    })
    .filter((file): file is ManagedFile => Boolean(file));
  const fileIdsReadyForApproval = [...new Set(filesReadyForApproval.map((file) => file.id))];
  const isGeneratingImages =
    generatingSubjectIds.length > 0 || generatingColoringPageSubjectIds.length > 0;

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
                      !onGenerateMissingImages ||
                      !canGenerateImages ||
                      missingImageCount === 0 ||
                      isGeneratingImages
                    }
                    onClick={onGenerateMissingImages}
                  >
                    {isGeneratingImages ? 'Generating' : 'Generate missing images'}
                  </AIButton>
                  <Button
                    disabled={fileIdsReadyForApproval.length === 0}
                    onClick={() => onApproveAll(fileIdsReadyForApproval)}
                  >
                    <CheckCheck aria-hidden="true" className="mr-2" size={17} />
                    Approve all
                  </Button>
                  <Button
                    disabled={
                      !onGenerateMissingColoringPages ||
                      !canGenerateImages ||
                      missingColoringPageCount === 0 ||
                      isGeneratingImages
                    }
                    onClick={onGenerateMissingColoringPages}
                  >
                    <FilePenLine aria-hidden="true" className="mr-2" size={17} />
                    Missing coloring pages
                  </Button>
                </div>
                <p className="max-w-sm text-sm text-ink-muted lg:text-right">
                  {imageGenerationHint ??
                    `${missingImageCount} topic${missingImageCount === 1 ? '' : 's'} still need an approved image.`}
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
          <PhotoProvider
            toolbarRender={({ onClose }) => <PhotoPreviewControls onClose={onClose} />}
          >
            <div className="grid gap-4">
              {prompts.map((prompt) => (
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
                  onApprove={onApprove}
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
