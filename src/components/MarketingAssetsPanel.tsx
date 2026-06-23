import { Check, RotateCw, Trash2 } from 'lucide-react';
import { PhotoProvider } from 'react-photo-view';

import {
  CHILDREN_SCENE_RECIPES,
  getApprovedMarketingSourceMasks,
  getMarketingAssetFiles,
  isMarketingAssetStale,
} from '../lib/marketingAssets';
import { AIButton } from './ui/AIButton';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { CheckboxCard } from './ui/CheckboxCard';
import { EmptyState } from './ui/EmptyState';
import { ImagePreviewButton } from './ui/ImagePreviewButton';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';

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
  onFinalizeSloganPoster: (previewFileId: string) => void;
  onGenerateMaskSheets: () => void;
  onGenerateChildrenScenePreviews: () => void;
  onFinalizeChildrenScene: (previewFileId: string) => void;
  onApprovePreview: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
};

const getLatestFiles = (
  files: ManagedFile[],
  type: MarketingAssetType,
  stage: 'preview' | 'final',
  limit: number,
) =>
  getMarketingAssetFiles(files, type, stage)
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
      <Badge tone={stale ? 'warning' : file.reviewState === 'approved' ? 'success' : 'neutral'}>
        {stale ? 'Stale' : file.reviewState === 'approved' ? 'Approved' : 'Preview'}
      </Badge>
    </div>
    {file.objectUrl ? (
      <div className="mt-3">
        <ImagePreviewButton
          src={file.objectUrl}
          alt={`${label} preview`}
          label={`Open full-size ${label.toLowerCase()} preview`}
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

export const MarketingAssetsPanel = ({
  project,
  files,
  hasAIProvider,
  busyAction,
  onMarketingSettingsChange,
  onGenerateSloganPreviews,
  onFinalizeSloganPoster,
  onGenerateMaskSheets,
  onGenerateChildrenScenePreviews,
  onFinalizeChildrenScene,
  onApprovePreview,
  onDeleteFile,
}: MarketingAssetsPanelProps) => {
  const sourceMasks = getApprovedMarketingSourceMasks(project, files);
  const canGenerate = busyAction === null && sourceMasks.length > 0;
  const canGenerateWithAI = canGenerate && hasAIProvider;
  const isGenerating = busyAction === 'marketing-generation';
  const sloganPreviews = getLatestFiles(files, 'slogan-poster', 'preview', 1);
  const sloganFinals = getLatestFiles(files, 'slogan-poster', 'final', 3);
  const maskSheets = getLatestFiles(files, 'mask-sheet', 'final', 20);
  const childrenPreviews = getLatestFiles(files, 'children-scene', 'preview', 3);
  const childrenFinals = getLatestFiles(files, 'children-scene', 'final', 3);
  const selectedChildrenSubjectIds = project.marketingSettings.childrenSceneSubjectIds;
  const selectedCount = selectedChildrenSubjectIds.length;

  const toggleChildrenSubject = (subjectId: string, checked: boolean) => {
    const nextIds = checked
      ? [...selectedChildrenSubjectIds, subjectId].slice(0, 3)
      : selectedChildrenSubjectIds.filter((id) => id !== subjectId);

    onMarketingSettingsChange({
      ...project.marketingSettings,
      childrenSceneSubjectIds: nextIds,
    });
  };

  const updateSlogan = (slogan: string) => {
    onMarketingSettingsChange({
      ...project.marketingSettings,
      slogan,
    });
  };

  const renderSourceMasks = () =>
    sourceMasks.length === 0 ? (
      <EmptyState>Approve at least one color mask before generating marketing assets.</EmptyState>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {sourceMasks.map((file) => (
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
                <p className="text-xs text-ink-muted">Approved mask source</p>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Marketing assets</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Generate optional listing graphics from the approved mask files.
            </p>
          </div>
          <Badge tone={sourceMasks.length > 0 ? 'success' : 'neutral'}>
            {sourceMasks.length} approved source mask{sourceMasks.length === 1 ? '' : 's'}
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
                Cloud OpenAI proxy is required for AI marketing asset generation.
              </Alert>
            ) : null}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-ink-strong">Approved mask sources</h3>
              {renderSourceMasks()}
            </section>
            <Input
              label="Marketing slogan"
              name="marketingSlogan"
              value={project.marketingSettings.slogan}
              placeholder={project.settings.title || '30 printable dinosaur masks for kids'}
              helperText="Used on slogan poster assets. If empty, the listing title is used."
              onChange={(event) => updateSlogan(event.target.value)}
            />
            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Slogan poster</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    Creates an AI poster preview from the approved masks, then a larger final
                    poster.
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGenerateSloganPreviews}>
                  Generate preview
                </AIButton>
              </div>
              {sloganPreviews.length > 0 ? (
                <div className="grid gap-4">
                  {sloganPreviews.map((file) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label="Slogan preview"
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button
                        variant="primary"
                        disabled={!canGenerateWithAI}
                        onClick={() => {
                          onApprovePreview(file.id);
                          onFinalizeSloganPoster(file.id);
                        }}
                      >
                        <Check aria-hidden="true" className="mr-2" size={17} />
                        Use option
                      </Button>
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
              {sloganFinals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {sloganFinals.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={`Final slogan ${index + 1}`}
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
                    Uses AI to compose approved masks into one or more polished sheet images.
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGenerateMaskSheets}>
                  Generate mask sheet
                </AIButton>
              </div>
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
                    Generates 3 scene concepts with AI-selected mask placement on children.
                  </p>
                </div>
                <AIButton disabled={!canGenerateWithAI} onClick={onGenerateChildrenScenePreviews}>
                  Generate 3 previews
                </AIButton>
              </div>
              {sourceMasks.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {sourceMasks.map((file) => {
                    const subject = project.subjects.find(
                      (item) => item.id === file.mappedSubjectId,
                    );
                    const checked = selectedChildrenSubjectIds.includes(file.mappedSubjectId ?? '');

                    return (
                      <CheckboxCard
                        key={file.id}
                        label={subject?.name ?? file.name}
                        checked={checked}
                        disabled={!checked && selectedCount >= 3}
                        onChange={(event) => {
                          if (file.mappedSubjectId) {
                            toggleChildrenSubject(file.mappedSubjectId, event.target.checked);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}
              <p className="text-xs text-ink-muted">
                Select up to 3 masks. If none are selected, the first approved masks are used.
              </p>
              {childrenPreviews.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {childrenPreviews.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={
                        CHILDREN_SCENE_RECIPES[index]?.label
                          ? `${CHILDREN_SCENE_RECIPES[index].label} option`
                          : `Scene option ${index + 1}`
                      }
                      stale={isMarketingAssetStale(file, sourceMasks)}
                    >
                      <Button
                        variant="primary"
                        disabled={!canGenerateWithAI}
                        onClick={() => {
                          onApprovePreview(file.id);
                          onFinalizeChildrenScene(file.id);
                        }}
                      >
                        <Check aria-hidden="true" className="mr-2" size={17} />
                        Use option
                      </Button>
                      <Button variant="ghost" onClick={() => onDeleteFile(file.id)}>
                        <Trash2 aria-hidden="true" className="mr-2" size={17} />
                        Discard
                      </Button>
                    </MarketingFileCard>
                  ))}
                </div>
              ) : null}
              {childrenFinals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {childrenFinals.map((file, index) => (
                    <MarketingFileCard
                      key={file.id}
                      file={file}
                      label={`Final children scene ${index + 1}`}
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
