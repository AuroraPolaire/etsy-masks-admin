import { Check, Clipboard, Copy, FileText, RotateCw, Trash2, X } from 'lucide-react';

import { copyText } from '../../lib/clipboard';
import { getFileForSubject, isImageFile } from '../../lib/files';
import { AIButton } from '../ui/AIButton';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { Surface } from '../ui/Surface';
import { Textarea } from '../ui/Textarea';

import type { ManagedFile, PromptItem, SubjectItem } from '../../types';

type PromptCardProps = {
  prompt: PromptItem;
  subjects: SubjectItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingSubjectId: string | null;
  allowTopicEditing: boolean;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onConfirmReview: (fileId: string) => void;
  onCopy: (label: string) => void;
};

export const PromptCard = ({
  prompt,
  subjects,
  files,
  canGenerateImages,
  generatingSubjectId,
  allowTopicEditing,
  onRemoveSubject,
  onGenerateImage,
  onApprove,
  onReject,
  onDelete,
  onNotesChange,
  onConfirmReview,
  onCopy,
}: PromptCardProps) => {
  const matchingFile = files.find(
    (file) => file.originalName.toLowerCase() === prompt.expectedFilename.toLowerCase(),
  );
  const mappedFile = getFileForSubject(files, prompt.subjectId, 'approved');
  const pendingFile = getFileForSubject(files, prompt.subjectId, 'pending');
  const rejectedFile = getFileForSubject(files, prompt.subjectId, 'rejected');
  const subjectFiles = files.filter(
    (file) =>
      file.kind === 'uploaded' && isImageFile(file) && file.mappedSubjectId === prompt.subjectId,
  );
  const previewFile = mappedFile ?? pendingFile ?? rejectedFile ?? subjectFiles[0];
  const subject = subjects.find((item) => item.id === prompt.subjectId);
  const isGenerating = generatingSubjectId === prompt.subjectId;

  return (
    <Surface as="article" key={prompt.subjectId} variant="muted" className="p-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(28rem,1fr)_minmax(20rem,26rem)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink-strong">{prompt.subjectName}</h3>
              <p className="mt-1 font-mono text-sm text-ink-base">{prompt.expectedFilename}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={matchingFile ? 'success' : 'neutral'}>
                {matchingFile ? 'Filename match' : 'Filename missing'}
              </Badge>
              <Badge tone={mappedFile ? 'success' : pendingFile ? 'warning' : 'neutral'}>
                {mappedFile ? 'Approved' : pendingFile ? 'Review needed' : 'No approved image'}
              </Badge>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Image prompt</p>
              <Surface
                variant="default"
                className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 text-sm leading-6 text-ink-base"
              >
                {prompt.prompt}
              </Surface>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Avoid</p>
              <Surface
                variant="default"
                className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words p-3 text-sm leading-6 text-ink-base"
              >
                {prompt.negativeRequirements}
              </Surface>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AIButton
              disabled={!canGenerateImages || generatingSubjectId !== null}
              onClick={() => onGenerateImage(prompt.subjectId)}
            >
              {isGenerating ? 'Generating' : previewFile ? 'Regenerate' : 'Generate image'}
            </AIButton>
            <IconButton
              icon={Copy}
              label={`Copy prompt for ${prompt.subjectName}`}
              onClick={() => {
                void copyText(prompt.prompt)
                  .then(() => onCopy(`Copied prompt for ${prompt.subjectName}`))
                  .catch(() => onCopy(`Could not copy prompt for ${prompt.subjectName}`));
              }}
            />
            <IconButton
              icon={FileText}
              label={`Copy filename for ${prompt.subjectName}`}
              onClick={() => {
                void copyText(prompt.expectedFilename)
                  .then(() => onCopy(`Copied filename for ${prompt.subjectName}`))
                  .catch(() => onCopy(`Could not copy filename for ${prompt.subjectName}`));
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
              Generating with OpenAI...
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
                      {previewFile.imageMetadata.width} x {previewFile.imageMetadata.height}
                    </Badge>
                  ) : null}
                </div>
                <Textarea
                  label="Review notes"
                  name={`topic-notes-${previewFile.id}`}
                  rows={2}
                  value={previewFile.reviewNotes}
                  onChange={(event) => onNotesChange(previewFile.id, event.target.value)}
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
            <Alert tone="info">Generate or upload a matching image to review it here.</Alert>
          )}
        </div>
      </div>
    </Surface>
  );
};
