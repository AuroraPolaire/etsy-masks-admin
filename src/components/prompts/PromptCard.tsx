import { Copy, FileText, RotateCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { copyText } from '../../lib/clipboard';
import {
  getCurrentColoringPageForSubject,
  getFileForSubject,
  isImageFile,
  isUsableFile,
} from '../../lib/files';
import { AIButton } from '../ui/AIButton';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ImagePreviewButton } from '../ui/ImagePreviewButton';
import { Surface } from '../ui/Surface';
import { Textarea } from '../ui/Textarea';

import type { ManagedFile, PromptItem, SubjectItem } from '../../types';
import type { BadgeTone } from '../ui/Badge';

type PromptCardProps = {
  prompt: PromptItem;
  subjects: SubjectItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingSubjectIds: string[];
  generatingColoringPageSubjectIds: string[];
  allowTopicEditing: boolean;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string, promptOverride?: string) => void;
  onGenerateColoringPage: (subjectId: string) => void;
  onDelete: (fileId: string) => void;
  onCopy: (label: string) => void;
};

type ReadyStatus = {
  label: string;
  tone: BadgeTone;
};

const getReadyTone = (file: ManagedFile | undefined): BadgeTone => (file ? 'success' : 'neutral');

const getReadyLabel = (file: ManagedFile | undefined, readyLabel: string, emptyLabel: string) =>
  file ? readyLabel : emptyLabel;

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
  onDelete,
  onCopy,
}: PromptCardProps) => {
  const [promptDraft, setPromptDraft] = useState(prompt.prompt);

  useEffect(() => {
    setPromptDraft(prompt.prompt);
  }, [prompt.prompt]);

  const mappedFile = getFileForSubject(files, prompt.subjectId);
  const latestColoringPageFile =
    getFileForSubject(files, prompt.subjectId, undefined, 'coloring-page') ??
    getFileForSubject(files, prompt.subjectId, 'pending', 'coloring-page');
  const currentColoringPageFile = mappedFile
    ? (getCurrentColoringPageForSubject(files, prompt.subjectId, mappedFile) ??
      getCurrentColoringPageForSubject(files, prompt.subjectId, mappedFile, 'pending'))
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
      isUsableFile(file) &&
      file.mappedSubjectId === prompt.subjectId,
  );
  const previewFile = mappedFile ?? subjectFiles.at(-1);
  const subject = subjects.find((item) => item.id === prompt.subjectId);
  const isGenerating = generatingSubjectIds.includes(prompt.subjectId);
  const isGeneratingColoringPage = generatingColoringPageSubjectIds.includes(prompt.subjectId);
  const colorStatus = {
    label: getReadyLabel(previewFile, 'Mask ready', 'Needs mask'),
    tone: getReadyTone(previewFile),
  };
  const coloringPageStatus: ReadyStatus = isColoringPageStale
    ? { label: 'Stale coloring page', tone: 'warning' }
    : {
        label: getReadyLabel(coloringPageFile, 'Coloring ready', 'Needs coloring page'),
        tone: getReadyTone(coloringPageFile),
      };
  const promptForGeneration = promptDraft.trim() || prompt.prompt;

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
            <Badge tone={colorStatus.tone}>{colorStatus.label}</Badge>
            <Badge tone={coloringPageStatus.tone}>{coloringPageStatus.label}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AIButton
            disabled={!canGenerateImages || isGenerating}
            onClick={() => onGenerateImage(prompt.subjectId, promptForGeneration)}
          >
            {isGenerating ? 'Generating' : previewFile ? 'Regenerate mask' : 'Generate mask'}
          </AIButton>
          <IconButton
            icon={Copy}
            label={`Copy prompt for ${prompt.subjectName}`}
            onClick={() => {
              void copyText(promptForGeneration)
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
              <Badge tone={colorStatus.tone}>{colorStatus.label}</Badge>
            </div>
            {isGenerating ? (
              <div className="mt-3 flex aspect-square flex-col items-center justify-center gap-3 rounded-control border border-surface-outline bg-surface-muted p-4 text-center text-sm text-ink-muted">
                <RotateCw aria-hidden="true" className="animate-spin" size={26} />
                Generating with OpenAI...
              </div>
            ) : previewFile?.objectUrl ? (
              <div className="mt-3 space-y-3">
                <ImagePreviewButton
                  src={previewFile.objectUrl}
                  alt={`Generated preview of ${prompt.subjectName}`}
                  label={`Open full-size color mask preview for ${prompt.subjectName}`}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {previewFile.imageMetadata ? (
                    <Badge tone="neutral">
                      {previewFile.imageMetadata.width} x {previewFile.imageMetadata.height}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => onDelete(previewFile.id)}>
                    <Trash2 aria-hidden="true" className="mr-2" size={17} />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <Alert tone="info" className="mt-3">
                Generate a color mask to review it here.
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
                  disabled={!canGenerateImages || !mappedFile || isGeneratingColoringPage}
                  onClick={() => onGenerateColoringPage(prompt.subjectId)}
                >
                  {isGeneratingColoringPage
                    ? 'Generating'
                    : coloringPageFile
                      ? 'Regenerate coloring page'
                      : 'Generate coloring page'}
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
                <ImagePreviewButton
                  src={coloringPageFile.objectUrl}
                  alt={`Coloring page preview of ${prompt.subjectName}`}
                  label={`Open full-size coloring page preview for ${prompt.subjectName}`}
                  frameClassName="bg-white"
                />
                {isColoringPageStale ? (
                  <Alert tone="warning">
                    This coloring page was generated from an older color mask. Regenerate it from
                    the current mask.
                  </Alert>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {coloringPageFile.imageMetadata ? (
                    <Badge tone="neutral">
                      {coloringPageFile.imageMetadata.width} x{' '}
                      {coloringPageFile.imageMetadata.height}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => onDelete(coloringPageFile.id)}>
                    <Trash2 aria-hidden="true" className="mr-2" size={17} />
                    Discard
                  </Button>
                </div>
              </div>
            ) : (
              <Alert tone="info" className="mt-3">
                Generate a coloring page after the mask is ready.
              </Alert>
            )}
          </Surface>
        </div>
        <details className="rounded-control border border-surface-outline bg-surface-raised p-3 text-sm text-ink-base">
          <summary className="cursor-pointer font-semibold text-ink-strong">
            Generation prompt
          </summary>
          <div className="mt-3 space-y-3">
            <Textarea
              label="Prompt for next generation"
              name={`topic-prompt-${prompt.subjectId}`}
              rows={8}
              value={promptDraft}
              helperText="Edit this before clicking Regenerate mask. It affects the next image request only."
              onChange={(event) => setPromptDraft(event.target.value)}
            />
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
