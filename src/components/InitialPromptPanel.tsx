import { ImagePlus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { StylePromptWizard } from './StylePromptWizard';
import { AIButton } from './ui/AIButton';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';
import { fileToDataUrl, formatBytes } from '../lib/files';

import type { BriefReferenceImage } from '../types';
import type { ChangeEvent } from 'react';

type InitialPromptPanelProps = {
  aiReady: boolean;
  disabled: boolean;
  isGenerating: boolean;
  onFillBrief: (initialPrompt: string, referenceImages: BriefReferenceImage[]) => void;
  onOpenBackendSaves: () => void;
};

type AttachedReferenceImage = BriefReferenceImage & {
  id: string;
  objectUrl: string;
};

const MAX_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;

const createReferenceObjectUrl = (file: File, fallbackUrl: string): string =>
  typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : fallbackUrl;

const revokeReferenceObjectUrl = (objectUrl: string) => {
  if (objectUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(objectUrl);
  }
};

export const InitialPromptPanel = ({
  aiReady,
  disabled,
  isGenerating,
  onFillBrief,
  onOpenBackendSaves,
}: InitialPromptPanelProps) => {
  const [initialPrompt, setInitialPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<AttachedReferenceImage[]>([]);
  const [referenceImageError, setReferenceImageError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const referenceImagesRef = useRef<AttachedReferenceImage[]>([]);

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(
    () => () => {
      referenceImagesRef.current.forEach((image) => revokeReferenceObjectUrl(image.objectUrl));
    },
    [],
  );

  const applyDraft = () => {
    onFillBrief(
      initialPrompt,
      referenceImages.map(({ name, mimeType, size, dataUrl }) => ({
        name,
        mimeType,
        size,
        dataUrl,
      })),
    );
  };

  const updateInitialPrompt = (value: string) => {
    setInitialPrompt(value);
  };

  const addReferenceImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    setReferenceImageError('');
    const availableSlots = MAX_REFERENCE_IMAGES - referenceImagesRef.current.length;
    const acceptedFiles = selectedFiles.slice(0, Math.max(availableSlots, 0));

    if (availableSlots <= 0) {
      setReferenceImageError(`Use up to ${MAX_REFERENCE_IMAGES} reference images.`);
      return;
    }

    if (selectedFiles.length > acceptedFiles.length) {
      setReferenceImageError(`Added ${acceptedFiles.length}; limit is ${MAX_REFERENCE_IMAGES}.`);
    }

    const nextImages: AttachedReferenceImage[] = [];
    for (const file of acceptedFiles) {
      if (!file.type.startsWith('image/')) {
        setReferenceImageError('Only image files can be attached.');
        continue;
      }

      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        setReferenceImageError(
          `Each reference image must be ${formatBytes(MAX_REFERENCE_IMAGE_BYTES)} or smaller.`,
        );
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        nextImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: file.type || 'image/png',
          size: file.size,
          dataUrl,
          objectUrl: createReferenceObjectUrl(file, dataUrl),
        });
      } catch {
        setReferenceImageError(`Could not read ${file.name}.`);
      }
    }

    if (nextImages.length > 0) {
      setReferenceImages((currentImages) => [...currentImages, ...nextImages]);
    }
  };

  const removeReferenceImage = (imageId: string) => {
    setReferenceImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);
      if (imageToRemove) {
        revokeReferenceObjectUrl(imageToRemove.objectUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Draft from an idea</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Describe the bundle once. The app drafts listing copy and a topic list.
              </p>
            </div>
            <Badge tone={aiReady ? 'success' : 'warning'}>
              {aiReady ? 'AI drafting ready' : 'Online AI setup needed'}
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 rounded-panel border border-surface-outline bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-strong">Style prompt wizard</p>
              <p className="mt-1 text-sm text-ink-muted">
                Build a prompt from visual styles, topics, SEO angle, and printable mask rules.
              </p>
            </div>
            <Button disabled={disabled} variant="primary" onClick={() => setWizardOpen(true)}>
              <Sparkles aria-hidden="true" className="mr-2" size={17} />
              Open wizard
            </Button>
          </div>
          <Textarea
            label="Bundle idea"
            name="initialPrompt"
            rows={7}
            placeholder="Example: 10 woodland animal masks for a kids birthday party, watercolor style, classroom friendly."
            value={initialPrompt}
            onChange={(event) => updateInitialPrompt(event.target.value)}
          />
          <div className="rounded-panel border border-surface-outline bg-surface-muted p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-strong">Reference images</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Add inspiration for theme, style, colors, or mask subjects.
                </p>
              </div>
              <label
                className={`inline-flex min-h-10 max-w-full items-center justify-center rounded-control border border-surface-outline bg-surface-raised px-3 py-2 text-center text-sm font-semibold text-ink-strong shadow-sm transition focus-within:ring-2 focus-within:ring-brand/20 focus-within:ring-offset-2 focus-within:ring-offset-surface-panel hover:bg-surface-muted ${
                  disabled || referenceImages.length >= MAX_REFERENCE_IMAGES
                    ? 'cursor-not-allowed opacity-55'
                    : 'cursor-pointer'
                }`}
              >
                <ImagePlus aria-hidden="true" className="mr-2" size={17} />
                Attach images
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={disabled || referenceImages.length >= MAX_REFERENCE_IMAGES}
                  onChange={addReferenceImages}
                />
              </label>
            </div>
            {referenceImageError ? (
              <Alert tone="warning" density="compact" className="mt-3">
                {referenceImageError}
              </Alert>
            ) : null}
            {referenceImages.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {referenceImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-control border border-surface-outline bg-surface-panel"
                  >
                    <img
                      className="aspect-square w-full bg-white object-contain"
                      src={image.objectUrl}
                      alt={`Reference ${image.name}`}
                    />
                    <div className="flex items-center justify-between gap-2 p-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink-strong">
                          {image.name}
                        </p>
                        <p className="text-xs text-ink-muted">{formatBytes(image.size)}</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger-fg transition hover:bg-feedback-danger-border/35 focus:outline-none focus:ring-2 focus:ring-feedback-danger-border"
                        aria-label={`Remove ${image.name}`}
                        disabled={disabled}
                        onClick={() => removeReferenceImage(image.id)}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {!aiReady ? <Button onClick={onOpenBackendSaves}>Open saved work</Button> : <span />}
            <AIButton
              disabled={
                disabled ||
                !aiReady ||
                (initialPrompt.trim().length === 0 && referenceImages.length === 0)
              }
              onClick={applyDraft}
            >
              {isGenerating ? 'Drafting brief...' : 'Draft brief'}
            </AIButton>
          </div>
        </CardBody>
      </Card>
      <StylePromptWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApply={setInitialPrompt}
      />
    </>
  );
};
