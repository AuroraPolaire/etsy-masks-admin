import { RotateCw, Trash2 } from 'lucide-react';
import { PhotoProvider } from 'react-photo-view';

import { MAX_MASK_SHEET_MASKS_PER_IMAGE, MIN_MASK_SHEET_MASKS_PER_IMAGE } from '../constants';
import {
  CHILDREN_SCENE_RECIPES,
  getApprovedMarketingSourceMasks,
  getMarketingAssetFiles,
  isMarketingAssetStale,
  normalizeMaskSheetMasksPerImage,
} from '../lib/marketingAssets';
import { AIButton } from './ui/AIButton';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { ImagePreviewButton } from './ui/ImagePreviewButton';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { Textarea } from './ui/Textarea';

import type {
  BusyAction,
  ManagedFile,
  MarketingAssetType,
  MarketingSettings,
  Project,
} from '../types';
import type { ReactNode } from 'react';

type MarketingAssetsPanelProps = {
  project: Project;
  files: ManagedFile[];
  hasAIProvider: boolean;
  busyAction: BusyAction;
  onMarketingSettingsChange: (settings: MarketingSettings) => void;
  onGenerateSloganPreviews: () => void;
  onGenerateMaskSheets: () => void;
  onGenerateChildrenScenePreviews: () => void;
  onGeneratePrinterScenePreviews: () => void;
  onDeleteFile: (fileId: string) => void;
};

const getSavedAssetFiles = (files: ManagedFile[], type: MarketingAssetType, limit: number) =>
  getMarketingAssetFiles(files, type, 'final')
    .filter((file) => file.reviewState === 'approved')
    .sort((left, right) => Date.parse(right.addedAt) - Date.parse(left.addedAt))
    .slice(0, limit)
    .reverse();

const MarketingFileCard = ({
  file,
  label,
  stale,
  children,
}: {
  file: ManagedFile;
  label: string;
  stale: boolean;
  children?: ReactNode;
}) => (
  <Surface variant="default" className="min-w-0 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-strong">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-ink-muted">{file.name}</p>
      </div>
      <Badge tone={stale ? 'warning' : 'success'}>{stale ? 'Stale' : 'Saved'}</Badge>
    </div>
    {file.objectUrl ? (
      <div className="mt-3">
        <ImagePreviewButton
          src={file.objectUrl}
          alt={label}
          label={`Open full-size ${label.toLowerCase()}`}
          frameClassName="bg-white"
        />
      </div>
    ) : null}
    {file.imageMetadata ? (
      <div className="mt-3">
        <Badge tone="neutral">
          {file.imageMetadata.width} x {file.imageMetadata.height}
        </Badge>
      </div>
    ) : null}
    {children ? <div className="mt-3 flex flex-wrap gap-2">{children}</div> : null}
  </Surface>
);

const getChildrenSceneLabel = (file: ManagedFile, fallbackIndex: number): string => {
  const optionIndex = file.marketingAsset?.optionIndex ?? fallbackIndex;
  const recipe = CHILDREN_SCENE_RECIPES[optionIndex % CHILDREN_SCENE_RECIPES.length];

  return recipe?.label
    ? `${recipe.label} suggestion ${fallbackIndex + 1}`
    : `Scene suggestion ${fallbackIndex + 1}`;
};

export const MarketingAssetsPanel = ({
  project,
  files,
  hasAIProvider,
  busyAction,
  onMarketingSettingsChange,
  onGenerateSloganPreviews,
  onGenerateMaskSheets,
  onGenerateChildrenScenePreviews,
  onGeneratePrinterScenePreviews,
  onDeleteFile,
}: MarketingAssetsPanelProps) => {
  const sourceMasks = getApprovedMarketingSourceMasks(project, files);
  const canQueueMarketingGeneration =
    busyAction === null ||
    busyAction === 'image-generation' ||
    busyAction === 'marketing-generation';
  const canGenerate = canQueueMarketingGeneration && sourceMasks.length > 0;
  const canGenerateWithAI = canGenerate && hasAIProvider;
  const isGenerating = busyAction === 'marketing-generation';
  const willQueueGeneration =
    busyAction === 'image-generation' || busyAction === 'marketing-generation';
  const sloganAssets = getSavedAssetFiles(files, 'slogan-poster', 24);
  const maskSheets = getSavedAssetFiles(files, 'mask-sheet', 20);
  const childrenAssets = getSavedAssetFiles(files, 'children-scene', 24);
  const printerSceneAssets = getSavedAssetFiles(files, 'printer-scene', 24);
  const sourceSubjectIds = new Set(
    sourceMasks
      .map((file) => file.mappedSubjectId)
      .filter((subjectId): subjectId is string => Boolean(subjectId)),
  );
  const selectedChildrenSubjectIds = project.marketingSettings.childrenSceneSubjectIds.filter(
    (subjectId) => sourceSubjectIds.has(subjectId),
  );
  const selectedCount = selectedChildrenSubjectIds.length;

  const toggleChildrenSubject = (subjectId: string, checked: boolean) => {
    const nextIds = checked
      ? Array.from(new Set([...selectedChildrenSubjectIds, subjectId])).slice(0, 3)
      : selectedChildrenSubjectIds.filter((id) => id !== subjectId);

    onMarketingSettingsChange({
      ...project.marketingSettings,
      childrenSceneSubjectIds: nextIds,
    });
  };

  const selectPrinterSceneMask = (subjectId: string) => {
    onMarketingSettingsChange({
      ...project.marketingSettings,
      printerSceneSubjectId: subjectId,
    });
  };

  const updateSlogan = (slogan: string) => {
    onMarketingSettingsChange({
      ...project.marketingSettings,
      slogan,
    });
  };

  const updateAdditionalPrompt = (additionalPrompt: string) => {
    onMarketingSettingsChange({
      ...project.marketingSettings,
      additionalPrompt,
    });
  };

  const updateMaskSheetMasksPerImage = (value: string) => {
    const parsedValue = Number.parseInt(value, 10);
    const nextValue = normalizeMaskSheetMasksPerImage(
      Number.isFinite(parsedValue) ? parsedValue : project.marketingSettings.maskSheetMasksPerImage,
    );

    onMarketingSettingsChange({
      ...project.marketingSettings,
      maskSheetMasksPerImage: nextValue,
    });
  };

  const renderSourceMasks = (options?: { selectable?: boolean }) =>
    sourceMasks.length === 0 ? (
      <EmptyState>Generate at least one color mask before generating marketing assets.</EmptyState>
    ) : (
      <div
        className={`grid gap-3 ${options?.selectable ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'}`}
      >
        {sourceMasks.map((file) => {
          const subject = project.subjects.find((item) => item.id === file.mappedSubjectId);
          const subjectLabel = subject?.name ?? file.name;
          const subjectId = file.mappedSubjectId ?? '';
          const checked = selectedChildrenSubjectIds.includes(subjectId);
          const disabled = options?.selectable ? !checked && selectedCount >= 3 : false;

          return options?.selectable ? (
            <Surface
              key={file.id}
              variant="default"
              className={`min-w-0 p-3 transition ${checked ? 'ring-2 ring-brand/30' : ''} ${disabled ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                {file.objectUrl ? (
                  <img
                    src={file.objectUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-control bg-white object-contain"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-strong">{subjectLabel}</p>
                  <p className="text-xs text-ink-muted">Ready mask source</p>
                </div>
                <input
                  id={`children-scene-mask-${file.id}`}
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-brand focus:ring-brand/20"
                  aria-label={subjectLabel}
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    if (subjectId) {
                      toggleChildrenSubject(subjectId, event.target.checked);
                    }
                  }}
                />
              </div>
            </Surface>
          ) : (
            <Surface key={file.id} variant="default" className="min-w-0 p-3">
              <div className="flex items-center gap-3">
                {file.objectUrl ? (
                  <img
                    src={file.objectUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-control bg-white object-contain"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-strong">{file.name}</p>
                  <p className="text-xs text-ink-muted">Ready mask source</p>
                </div>
              </div>
            </Surface>
          );
        })}
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Marketing assets</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Generate optional listing graphics from the ready mask files.
            </p>
          </div>
          <Badge tone={sourceMasks.length > 0 ? 'success' : 'neutral'}>
            {sourceMasks.length} ready source mask{sourceMasks.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <PhotoProvider>
          <div className="space-y-6">
            {isGenerating ? (
              <Alert tone="info" className="flex items-center gap-3">
                <RotateCw aria-hidden="true" className="animate-spin" size={18} />
                Marketing generation is running.
              </Alert>
            ) : null}
            {!hasAIProvider ? (
              <Alert tone="info">
                Online AI is required for slogan posters and children scenes. Mask sheets are
                created locally.
              </Alert>
            ) : null}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-strong">Ready mask sources</h3>
              {renderSourceMasks()}
            </section>
            <Surface variant="muted" className="p-4">
              <h3 className="text-sm font-bold text-ink-strong">How to use marketing images</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Use these images as Etsy listing photos or social posts. Buyers should print the
                actual mask and coloring-page files from the ZIP at 100% scale on cardstock or thick
                paper. Helpful overlay text is short and concrete: Printable masks, Print at home,
                Cut and wear, or Digital download.
              </p>
            </Surface>
            <section className="space-y-3">
              <Input
                label="Marketing slogan"
                name="marketingSlogan"
                value={project.marketingSettings.slogan}
                placeholder={project.settings.title || '30 printable dinosaur masks for kids'}
                helperText="Used on slogan poster assets. If empty, the listing title is used."
                onChange={(event) => updateSlogan(event.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Slogan poster</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Generates an AI slogan poster using the slogan text and theme.
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGenerateSloganPreviews}>
                  {willQueueGeneration ? 'Queue variation' : 'Generate variation'}
                </AIButton>
              </div>
              {sloganAssets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {sloganAssets.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={`Slogan suggestion ${index + 1}`}
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Mask sheet</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Creates white-background sheet images locally with masks only and no text.
                  </p>
                </div>
                <Button disabled={!canGenerate} variant="primary" onClick={onGenerateMaskSheets}>
                  {willQueueGeneration ? 'Queue mask sheets' : 'Create mask sheets'}
                </Button>
              </div>
              <Input
                label="Masks per mask-sheet image"
                name="maskSheetMasksPerImage"
                type="number"
                min={MIN_MASK_SHEET_MASKS_PER_IMAGE}
                max={MAX_MASK_SHEET_MASKS_PER_IMAGE}
                step={1}
                value={project.marketingSettings.maskSheetMasksPerImage}
                helperText={`Choose ${MIN_MASK_SHEET_MASKS_PER_IMAGE}-${MAX_MASK_SHEET_MASKS_PER_IMAGE} masks per generated image. Example: 12 masks with 4 per image creates 3 mask sheets.`}
                onChange={(event) => updateMaskSheetMasksPerImage(event.target.value)}
              />
              {maskSheets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {maskSheets.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={`Mask sheet ${index + 1}`}
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Children scene</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Generates 3 saved scene suggestions with AI-selected mask placement on children.
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGenerateChildrenScenePreviews}>
                  {willQueueGeneration
                    ? childrenAssets.length > 0
                      ? 'Queue +3 more'
                      : 'Queue 3 suggestions'
                    : childrenAssets.length > 0
                      ? 'Generate +3 more'
                      : 'Generate 3 suggestions'}
                </AIButton>
              </div>
              <Textarea
                label="Additional prompt for AI scenes"
                name="marketingAdditionalPrompt"
                value={project.marketingSettings.additionalPrompt}
                rows={3}
                placeholder="Example: brighter classroom scene, more readable printable text, use warm daylight"
                helperText="Optional direction for AI slogan posters and children-scene suggestions. Local mask-sheet images ignore this."
                onChange={(event) => updateAdditionalPrompt(event.target.value)}
              />
              {sourceMasks.length > 0 ? renderSourceMasks({ selectable: true }) : null}
              <p className="text-xs text-ink-muted">
                Select up to 3 masks. If none are selected, the first ready masks are used.
              </p>
              {childrenAssets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {childrenAssets.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={getChildrenSceneLabel(file, index)}
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Printer scene</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Generates a lifestyle craft-desk scene with a printer sliding out the selected
                    mask. Quality and size are fixed (low, 1024×1024).
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGeneratePrinterScenePreviews}>
                  {willQueueGeneration ? 'Queue printer scene' : 'Generate printer scene'}
                </AIButton>
              </div>
              {sourceMasks.length === 0 ? (
                <EmptyState>
                  Generate at least one color mask before generating a printer scene.
                </EmptyState>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {sourceMasks.map((file) => {
                    const subject = project.subjects.find(
                      (item) => item.id === file.mappedSubjectId,
                    );
                    const subjectLabel = subject?.name ?? file.name;
                    const subjectId = file.mappedSubjectId ?? '';
                    const isSelected = project.marketingSettings.printerSceneSubjectId
                      ? project.marketingSettings.printerSceneSubjectId === subjectId
                      : sourceMasks[0]?.id === file.id;

                    return (
                      <Surface
                        key={file.id}
                        variant="default"
                        className={`min-w-0 cursor-pointer p-3 transition ${isSelected ? 'ring-2 ring-brand/30' : ''}`}
                        onClick={() => subjectId && selectPrinterSceneMask(subjectId)}
                      >
                        <div className="flex items-start gap-3">
                          {file.objectUrl ? (
                            <img
                              src={file.objectUrl}
                              alt=""
                              className="size-16 shrink-0 rounded-control bg-white object-contain"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-strong">
                              {subjectLabel}
                            </p>
                            <p className="text-xs text-ink-muted">Ready mask source</p>
                          </div>
                          <input
                            type="radio"
                            className="mt-1 size-4 shrink-0 accent-brand"
                            aria-label={subjectLabel}
                            checked={isSelected}
                            readOnly
                          />
                        </div>
                      </Surface>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-ink-muted">
                Select one mask to feature in the printer scene. If none selected, the first ready
                mask is used.
              </p>
              {printerSceneAssets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {printerSceneAssets.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={`Printer scene ${index + 1}`}
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </PhotoProvider>
      </CardBody>
    </Card>
  );
};
