import { Check, Clipboard, Copy, FileText, RotateCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { getFileForSubject, isImageFile } from '../lib/files';
import { AIButton } from './ui/AIButton';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { Textarea } from './ui/Textarea';

import type { SubjectItem, ManagedFile, PromptItem } from '../types';

type PromptManagerProps = {
  subjects: SubjectItem[];
  prompts: PromptItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingSubjectId: string | null;
  allowTopicEditing?: boolean;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onConfirmReview: (fileId: string) => void;
  onCopy: (label: string) => void;
};

const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export const PromptManager = ({
  subjects,
  prompts,
  files,
  canGenerateImages,
  generatingSubjectId,
  allowTopicEditing = true,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onApprove,
  onReject,
  onDelete,
  onNotesChange,
  onConfirmReview,
  onCopy,
}: PromptManagerProps) => {
  const [subjectName, setSubjectName] = useState('');

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
            <h2 className="text-lg font-bold text-ink-strong">Mask topics</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Generate masks with the OpenAI Images API, or copy prompts for manual use.
            </p>
          </div>
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
          <EmptyState>Add at least one topic to generate image prompts.</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {prompts.map((prompt) => {
              const matchingFile = files.find(
                (file) => file.originalName.toLowerCase() === prompt.expectedFilename.toLowerCase(),
              );
              const mappedFile = getFileForSubject(files, prompt.subjectId, 'approved');
              const pendingFile = getFileForSubject(files, prompt.subjectId, 'pending');
              const rejectedFile = getFileForSubject(files, prompt.subjectId, 'rejected');
              const subjectFiles = files.filter(
                (file) =>
                  file.kind === 'uploaded' &&
                  isImageFile(file) &&
                  file.mappedSubjectId === prompt.subjectId,
              );
              const previewFile = mappedFile ?? pendingFile ?? rejectedFile ?? subjectFiles[0];
              const subject = subjects.find((item) => item.id === prompt.subjectId);
              const isGenerating = generatingSubjectId === prompt.subjectId;

              return (
                <Surface as="article" key={prompt.subjectId} variant="muted" className="p-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-ink-strong">
                            {prompt.subjectName}
                          </h3>
                          <p className="mt-1 font-mono text-sm text-ink-base">
                            {prompt.expectedFilename}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={matchingFile ? 'success' : 'neutral'}>
                            {matchingFile ? 'Filename matched' : 'No filename match'}
                          </Badge>
                          <Badge
                            tone={mappedFile ? 'success' : pendingFile ? 'warning' : 'neutral'}
                          >
                            {mappedFile
                              ? 'Approved'
                              : pendingFile
                                ? 'Needs review'
                                : 'No approved image'}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-ink-muted">Prompt</p>
                          <Surface variant="default" className="mt-1 p-3 text-sm text-ink-base">
                            {prompt.prompt}
                          </Surface>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-ink-muted">
                            Negative requirements
                          </p>
                          <Surface variant="default" className="mt-1 p-3 text-sm text-ink-base">
                            {prompt.negativeRequirements}
                          </Surface>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <AIButton
                          disabled={!canGenerateImages || generatingSubjectId !== null}
                          onClick={() => onGenerateImage(prompt.subjectId)}
                        >
                          {isGenerating
                            ? 'Generating...'
                            : previewFile
                              ? 'Regenerate image'
                              : 'Generate image'}
                        </AIButton>
                        <IconButton
                          icon={Copy}
                          label={`Copy prompt for ${prompt.subjectName}`}
                          onClick={() => {
                            void copyText(prompt.prompt)
                              .then(() => onCopy(`Copied prompt for ${prompt.subjectName}`))
                              .catch(() =>
                                onCopy(`Could not copy prompt for ${prompt.subjectName}`),
                              );
                          }}
                        />
                        <IconButton
                          icon={FileText}
                          label={`Copy filename for ${prompt.subjectName}`}
                          onClick={() => {
                            void copyText(prompt.expectedFilename)
                              .then(() => onCopy(`Copied filename for ${prompt.subjectName}`))
                              .catch(() =>
                                onCopy(`Could not copy filename for ${prompt.subjectName}`),
                              );
                          }}
                        />
                        {allowTopicEditing ? (
                          <IconButton
                            icon={Trash2}
                            label={`Remove ${prompt.subjectName}`}
                            variant="danger"
                            onClick={() => {
                              if (subject) {
                                onRemoveSubject(subject.id);
                              }
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-0">
                      {isGenerating ? (
                        <Surface
                          variant="default"
                          className="flex aspect-square flex-col items-center justify-center gap-3 p-4 text-center text-sm text-ink-muted"
                        >
                          <RotateCw aria-hidden="true" className="animate-spin" size={26} />
                          Generating this mask with OpenAI...
                        </Surface>
                      ) : previewFile?.objectUrl ? (
                        <Surface variant="default" className="overflow-hidden">
                          <div className="flex aspect-square items-center justify-center bg-surface-muted">
                            <img
                              className="size-full object-contain p-3"
                              src={previewFile.objectUrl}
                              alt={`Generated preview of ${prompt.subjectName}`}
                            />
                          </div>
                          <div className="space-y-3 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                tone={
                                  previewFile.reviewState === 'approved'
                                    ? 'success'
                                    : previewFile.reviewState === 'rejected'
                                      ? 'danger'
                                      : 'warning'
                                }
                              >
                                {previewFile.reviewState}
                              </Badge>
                              {previewFile.imageMetadata ? (
                                <Badge tone="neutral">
                                  {previewFile.imageMetadata.width} x{' '}
                                  {previewFile.imageMetadata.height}
                                </Badge>
                              ) : null}
                            </div>
                            <Textarea
                              label="Review notes"
                              name={`topic-notes-${previewFile.id}`}
                              rows={2}
                              value={previewFile.reviewNotes}
                              onChange={(event) =>
                                onNotesChange(previewFile.id, event.target.value)
                              }
                            />
                            <div className="flex flex-wrap gap-2">
                              <IconButton
                                icon={Check}
                                label={`Approve ${prompt.subjectName}`}
                                variant="success"
                                onClick={() => onApprove(previewFile.id)}
                              />
                              <IconButton
                                icon={X}
                                label={`Reject ${prompt.subjectName}`}
                                variant="danger"
                                onClick={() => onReject(previewFile.id)}
                              />
                              <IconButton
                                icon={Clipboard}
                                label={`Confirm review for ${prompt.subjectName}`}
                                onClick={() => onConfirmReview(previewFile.id)}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`Delete image for ${prompt.subjectName}`}
                                variant="ghost"
                                onClick={() => onDelete(previewFile.id)}
                              />
                            </div>
                          </div>
                        </Surface>
                      ) : (
                        <Alert tone="info">
                          Generate this topic or upload a matching file to review the image here.
                        </Alert>
                      )}
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
