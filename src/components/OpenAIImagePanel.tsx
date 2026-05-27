import { getOpenAIImageCostComparison, formatUsdEstimate } from '../lib/openaiImageCosts';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';

import type { OpenAIImageQuality, OpenAIImageSettings } from '../types';

type OpenAIImagePanelProps = {
  settings: OpenAIImageSettings;
  coloringPageQuality: OpenAIImageQuality;
  missingImageCount: number;
  subjectCount: number;
  backendOpenAIReady: boolean;
  onChange: (settings: OpenAIImageSettings) => void;
  onColoringPageQualityChange: (quality: OpenAIImageQuality) => void;
};

const imagePresets: Array<{
  id: string;
  label: string;
  description: string;
  settings: Pick<OpenAIImageSettings, 'model' | 'size' | 'quality' | 'background' | 'outputFormat'>;
  coloringPageQuality: OpenAIImageQuality;
}> = [
  {
    id: 'budget',
    label: 'Budget',
    description: 'Fast, low-cost 1024 square masks for early drafts.',
    settings: {
      model: 'gpt-image-2',
      size: '1024x1024',
      quality: 'low',
      background: 'opaque',
      outputFormat: 'png',
    },
    coloringPageQuality: 'low',
  },
  {
    id: 'recommended',
    label: 'Recommended',
    description: 'Higher 1536 square output while keeping generation cost controlled.',
    settings: {
      model: 'gpt-image-2',
      size: '1536x1536',
      quality: 'low',
      background: 'opaque',
      outputFormat: 'png',
    },
    coloringPageQuality: 'low',
  },
  {
    id: 'higher-detail',
    label: 'Higher detail',
    description: 'Use medium mask quality for final detail checks.',
    settings: {
      model: 'gpt-image-2',
      size: '1536x1536',
      quality: 'medium',
      background: 'opaque',
      outputFormat: 'png',
    },
    coloringPageQuality: 'low',
  },
];

export const OpenAIImagePanel = ({
  settings,
  coloringPageQuality,
  missingImageCount,
  subjectCount,
  backendOpenAIReady,
  onChange,
  onColoringPageQualityChange,
}: OpenAIImagePanelProps) => {
  const update = <Key extends keyof OpenAIImageSettings>(
    key: Key,
    value: OpenAIImageSettings[Key],
  ) => {
    onChange({ ...settings, [key]: value });
  };
  const transparentUnsupported =
    settings.background === 'transparent' &&
    (settings.model === 'gpt-image-2' ||
      (settings.outputFormat !== 'png' && settings.outputFormat !== 'webp'));
  const costComparison = getOpenAIImageCostComparison(
    settings.quality,
    settings.size,
    missingImageCount,
    subjectCount,
    coloringPageQuality,
  );
  const hasCostFallbackAssumption = costComparison.some(
    (estimate) => estimate.usesFallbackAssumption,
  );
  const activePreset = imagePresets.find(
    (preset) =>
      preset.coloringPageQuality === coloringPageQuality &&
      Object.entries(preset.settings).every(
        ([key, value]) => settings[key as keyof OpenAIImageSettings] === value,
      ),
  );

  const applyPreset = (preset: (typeof imagePresets)[number]) => {
    onChange({
      ...settings,
      ...preset.settings,
    });
    onColoringPageQualityChange(preset.coloringPageQuality);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Generation defaults</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Choose a simple quality preset. Advanced controls are available when you need exact
              model, size, background, or format settings.
            </p>
          </div>
          <div>
            <Badge tone={backendOpenAIReady ? 'success' : 'warning'}>
              {backendOpenAIReady ? 'AI image service ready' : 'AI setup needed'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {imagePresets.map((preset) => {
            const isActive = activePreset?.id === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                className={`rounded-control border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                  isActive
                    ? 'border-brand-border bg-brand-subtle'
                    : 'border-surface-outline bg-surface-raised hover:border-brand-border hover:bg-surface-muted'
                }`}
                onClick={() => applyPreset(preset)}
              >
                <span className="block text-sm font-bold text-ink-strong">{preset.label}</span>
                <span className="mt-1 block text-xs leading-5 text-ink-muted">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
        {transparentUnsupported ? (
          <Alert tone="warning">
            Transparent output needs GPT Image 1.x with PNG or WEBP. With `gpt-image-2`, requests
            use an opaque background.
          </Alert>
        ) : null}
        <details className="rounded-control border border-surface-outline bg-surface-raised">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink-strong">
            Advanced image controls
          </summary>
          <div className="grid gap-4 border-t border-surface-outline p-4">
            <Select
              label="Image model"
              name="openaiModel"
              value={settings.model}
              options={[
                { value: 'gpt-image-2', label: 'gpt-image-2 (preferred)' },
                { value: 'gpt-image-1.5', label: 'gpt-image-1.5 (transparent backgrounds)' },
                { value: 'gpt-image-1', label: 'gpt-image-1' },
                { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini' },
              ]}
              onChange={(event) =>
                update('model', event.target.value as OpenAIImageSettings['model'])
              }
            />
            <Select
              label="Size"
              name="openaiSize"
              value={settings.size}
              options={[
                { value: '1024x1024', label: '1024 x 1024 square' },
                { value: '1536x1536', label: '1536 x 1536 square' },
                { value: '1536x1024', label: '1536 x 1024 landscape' },
                { value: '1024x1536', label: '1024 x 1536 portrait' },
                { value: 'auto', label: 'Auto API size' },
              ]}
              helperText="OpenAI currently supports square, landscape, portrait, and auto sizes for GPT Image generation."
              onChange={(event) =>
                update('size', event.target.value as OpenAIImageSettings['size'])
              }
            />
            <Select
              label="Mask quality"
              name="openaiQuality"
              value={settings.quality}
              options={[
                { value: 'low', label: 'Low (preferred)' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'auto', label: 'Auto' },
              ]}
              onChange={(event) =>
                update('quality', event.target.value as OpenAIImageSettings['quality'])
              }
            />
            <Select
              label="Coloring page quality"
              name="coloringPageQuality"
              value={coloringPageQuality}
              options={[
                { value: 'low', label: 'Low (preferred)' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'auto', label: 'Auto' },
              ]}
              helperText="Uses the same model, size, background, and format as masks, with separate quality control."
              onChange={(event) =>
                onColoringPageQualityChange(event.target.value as OpenAIImageQuality)
              }
            />
            <Select
              label="Background"
              name="openaiBackground"
              value={settings.background}
              options={[
                { value: 'opaque', label: 'White print background' },
                { value: 'transparent', label: 'Transparent PNG/WEBP' },
                { value: 'auto', label: 'Auto' },
              ]}
              onChange={(event) =>
                update('background', event.target.value as OpenAIImageSettings['background'])
              }
            />
            <Select
              label="Output format"
              name="openaiOutputFormat"
              value={settings.outputFormat}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'webp', label: 'WEBP' },
                { value: 'jpeg', label: 'JPEG' },
              ]}
              onChange={(event) =>
                update('outputFormat', event.target.value as OpenAIImageSettings['outputFormat'])
              }
            />
          </div>
          <Surface variant="muted" className="m-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-strong">Estimated image cost</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Based on the selected size and separate mask/coloring quality. Actual OpenAI
                  billing can vary.
                </p>
              </div>
              <Badge tone="neutral">
                masks {settings.quality} / coloring {coloringPageQuality} / {settings.size}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {costComparison.map((estimate) => (
                <Surface key={estimate.model} variant="default" className="p-3 text-sm">
                  <p className="font-semibold text-ink-strong">{estimate.model}</p>
                  <dl className="mt-2 grid gap-1 text-ink-base">
                    <div className="flex justify-between gap-4">
                      <dt>One mask</dt>
                      <dd className="font-semibold">{formatUsdEstimate(estimate.oneImageUsd)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Missing set ({missingImageCount})</dt>
                      <dd className="font-semibold">
                        {formatUsdEstimate(estimate.missingImagesUsd)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Full bundle ({subjectCount})</dt>
                      <dd className="font-semibold">{formatUsdEstimate(estimate.fullBundleUsd)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Color + coloring pages</dt>
                      <dd className="font-semibold">
                        {formatUsdEstimate(estimate.fullBundleWithColoringPagesUsd)}
                      </dd>
                    </div>
                  </dl>
                </Surface>
              ))}
            </div>
            {hasCostFallbackAssumption ? (
              <p className="mt-3 text-xs text-ink-muted">
                Auto is estimated as low quality at 1024 x 1024.
              </p>
            ) : null}
          </Surface>
        </details>
      </CardBody>
    </Card>
  );
};
