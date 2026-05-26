import { Check, Copy, FileText, RotateCw, Trash2, X } from 'lucide-react';

import { copyText } from '../../lib/clipboard';
import { getCurrentColoringPageForSubject, getFileForSubject, isImageFile } from '../../lib/files';
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
  generatingSubjectIds: string[];
  generatingColoringPageSubjectIds: string[];
  allowTopicEditing: boolean;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onGenerateColoringPage: (subjectId: string) => void;
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onCopy: (label: string) => void;
};

export const PromptCard = ({
  prompt,
  subjects,
  files,
  canGenerateImages,
  generatingSubjectIds,
  generatingColoringPageSubjectIds,
  allowTopicEditing,
  onRemoveSubject,
  onGenerateImage,
  onGenerateColoringPage,
  onApprove,
  onReject,
  onDelete,
  onNotesChange,
  onCopy,
}: PromptCardProps) => {
  const mappedFile = getFileForSubject(files, prompt.subjectId, 'approved');
  const pendingFile = getFileForSubject(files, prompt.subjectId, 'pending');
  const rejectedFile = getFileForSubject(files, prompt.subjectId, 'rejected');
  const latestColoringPageFile =
    getFileForSubject(files, prompt.subjectId, 'approved', 'coloring-page') ??
    getFileForSubject(files, prompt.subjectId, 'pending', 'coloring-page') ??
    getFileForSubject(files, prompt.subjectId, 'rejected', 'coloring-page');
  const currentColoringPageFile = mappedFile
    ? (getCurrentColoringPageForSubject(files, prompt.subjectId, mappedFile, 'approved') ??
      getCurrentColoringPageForSubject(files, prompt.subjectId, mappedFile, 'pending') ??
      getCurrentColoringPageForSubject(files, prompt.subjectId, mappedFile, 'rejected'))
    : undefined;
  const staleColoringPageFile =
    latestColoringPageFile?.sourceFileId &&
    mappedFile &&
    latestColoringPageFile.sourceFileId !== mappedFile.id
      ? latestColoringPageFile
      : undefined;
  const coloringPageFile =
    currentColoringPageFile ??
    staleColoringPageFile ??
    (!mappedFile ? latestColoringPageFile : undefined);
  const isColoringPageStale = Boolean(
    staleColoringPageFile && coloringPageFile?.id === staleColoringPageFile.id,
  );
  const subjectFiles = files.filter(
    (file) =>
      file.kind === 'uploaded' &&
      file.assetVariant === 'color' &&
      isImageFile(file) &&
      file.mappedSubjectId === prompt.subjectId,
  );
  const previewFile = pendingFile ?? rejectedFile ?? mappedFile ?? subjectFiles.at(-1);
  const subject = subjects.find((item) => item.id === prompt.subjectId);
  const isGenerating = generatingSubjectIds.includes(prompt.subjectId);
  const isGeneratingColoringPage = generatingColoringPageSubjectIds.includes(prompt.subjectId);
  const isAnyImageGenerating =
    generatingSubjectIds.length > 0 || generatingColoringPageSubjectIds.length > 0;
  const reviewStatus = pendingFile
    ? { label: 'Review needed', tone: 'warning' as const }
    : rejectedFile
      ? { label: 'Rejected', tone: 'danger' as const }
      : mappedFile
        ? { label: 'Approved', tone: 'success' as const }
        : { label: 'Needs image', tone: 'neutral' as const };
  const coloringPageStatus = isColoringPageStale
    ? { label: 'Coloring page stale', tone: 'warning' as const }
    : coloringPageFile
      ? coloringPageFile.reviewState === 'approved'
        ? { label: 'Coloring page ready', tone: 'success' as const }
        : coloringPageFile.reviewState === 'rejected'
          ? { label: 'Coloring page rejected', tone: 'danger' as const }
          : { label: 'Coloring page review', tone: 'warning' as const }
      : { label: 'Needs coloring page', tone: 'neutral' as const };

  return (
    <Surface as="article" key={prompt.subjectId} variant="muted" className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-ink-strong">
              {prompt.subjectName}
            </h3>
            <p className="mt-1 break-all font-mono text-sm text-ink-base">
              {prompt.expectedFilename}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={reviewStatus.tone}>{reviewStatus.label}</Badge>
            <Badge tone={coloringPageStatus.tone}>{coloringPageStatus.label}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AIButton
            disabled={!canGenerateImages || isAnyImageGenerating}
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
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Surface variant="default" className="min-w-0 overflow-hidden p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-strong">Color mask</p>
                <p className="mt-1 break-all font-mono text-xs text-ink-muted">
                  {previewFile?.name ?? prompt.expectedFilename}
                </p>
              </div>
              <Badge tone={reviewStatus.tone}>{reviewStatus.label}</Badge>
            </div>
            {isGenerating ? (
              <div className="mt-3 flex aspect-square flex-col items-center justify-center gap-3 rounded-control border border-surface-outline bg-surface-muted p-4 text-center text-sm text-ink-muted">
                <RotateCw aria-hidden="true" className="animate-spin" size={26} />
                Generating with OpenAI...
              </div>
            ) : previewFile?.objectUrl ? (
              <div className="mt-3 space-y-3">
                <div className="flex aspect-square items-center justify-center rounded-control bg-surface-muted">
                  <img
                    className="size-full object-contain p-3"
                    src={previewFile.objectUrl}
                    alt={`Generated preview of ${prompt.subjectName}`}
                  />
                </div>
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
                    icon={Trash2}
                    label={`Delete image for ${prompt.subjectName}`}
                    variant="ghost"
                    onClick={() => onDelete(previewFile.id)}
                  />
                </div>
              </div>
            ) : (
              <Alert tone="info" className="mt-3">
                Generate or upload an image to review it here.
              </Alert>
            )}
          </Surface>
          <Surface variant="default" className="min-w-0 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-strong">Coloring page</p>
                <p className="mt-1 break-all font-mono text-xs text-ink-muted">
                  {coloringPageFile?.name ?? `${prompt.subjectName} line-art PNG`}
                </p>
              </div>
              {coloringPageFile && !isGeneratingColoringPage && !isColoringPageStale ? (
                <Badge tone={coloringPageStatus.tone}>{coloringPageStatus.label}</Badge>
              ) : (
                <AIButton
                  disabled={!canGenerateImages || !mappedFile || isAnyImageGenerating}
                  onClick={() => onGenerateColoringPage(prompt.subjectId)}
                >
                  {isGeneratingColoringPage ? 'Generating' : 'Generate coloring page'}
                </AIButton>
              )}
            </div>
            {isGeneratingColoringPage ? (
              <div className="mt-3 flex aspect-square items-center justify-center gap-3 rounded-control border border-surface-outline bg-surface-muted p-4 text-sm text-ink-muted">
                <RotateCw aria-hidden="true" className="animate-spin" size={20} />
                Creating line art...
              </div>
            ) : coloringPageFile?.objectUrl ? (
              <div className="mt-3 space-y-3">
                <div className="flex aspect-square items-center justify-center rounded-control bg-white">
                  <img
                    className="size-full object-contain p-3"
                    src={coloringPageFile.objectUrl}
                    alt={`Coloring page preview of ${prompt.subjectName}`}
                  />
                </div>
                {isColoringPageStale ? (
                  <Alert tone="warning">
                    This coloring page was generated from an older color mask. Regenerate it from
                    the current approved mask.
                  </Alert>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      isColoringPageStale
                        ? 'warning'
                        : coloringPageFile.reviewState === 'approved'
                          ? 'success'
                          : coloringPageFile.reviewState === 'rejected'
                            ? 'danger'
                            : 'warning'
                    }
                  >
                    {isColoringPageStale ? 'stale' : coloringPageFile.reviewState}
                  </Badge>
                  {coloringPageFile.imageMetadata ? (
                    <Badge tone="neutral">
                      {coloringPageFile.imageMetadata.width} x{' '}
                      {coloringPageFile.imageMetadata.height}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isColoringPageStale && coloringPageFile.reviewState !== 'approved' ? (
                    <IconButton
                      icon={Check}
                      label={`Approve coloring page for ${prompt.subjectName}`}
                      variant="success"
                      onClick={() => onApprove(coloringPageFile.id)}
                    />
                  ) : null}
                  {!isColoringPageStale && coloringPageFile.reviewState !== 'rejected' ? (
                    <IconButton
                      icon={X}
                      label={`Reject coloring page for ${prompt.subjectName}`}
                      variant="danger"
                      onClick={() => onReject(coloringPageFile.id)}
                    />
                  ) : null}
                  <IconButton
                    icon={Trash2}
                    label={`Delete coloring page for ${prompt.subjectName}`}
                    variant="ghost"
                    onClick={() => onDelete(coloringPageFile.id)}
                  />
                </div>
              </div>
            ) : (
              <Alert tone="info" className="mt-3">
                Approve the color mask to auto-create the coloring page.
              </Alert>
            )}
          </Surface>
        </div>
        <details className="rounded-control border border-surface-outline bg-surface-raised p-3 text-sm text-ink-base">
          <summary className="cursor-pointer font-semibold text-ink-strong">Prompt details</summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Image prompt</p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-6">{prompt.prompt}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Avoid</p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                {prompt.negativeRequirements}
              </p>
            </div>
          </div>
        </details>
      </div>
    </Surface>
  );
};
