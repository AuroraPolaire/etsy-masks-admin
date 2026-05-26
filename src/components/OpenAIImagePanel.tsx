import { finalImageResolutionOptions } from '../lib/imageResolution';
import { getOpenAIImageCostComparison, formatUsdEstimate } from '../lib/openaiImageCosts';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';

import type { OpenAIImageSettings } from '../types';

type OpenAIImagePanelProps = {
  settings: OpenAIImageSettings;
  missingImageCount: number;
  subjectCount: number;
  backendOpenAIReady: boolean;
  onChange: (settings: OpenAIImageSettings) => void;
};

export const OpenAIImagePanel = ({
  settings,
  missingImageCount,
  subjectCount,
  backendOpenAIReady,
  onChange,
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
  );
  const hasCostFallbackAssumption = costComparison.some(
    (estimate) => estimate.usesFallbackAssumption,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Generation defaults</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Configure image model, size, quality, background, and output format. Generation runs
              through the backend OpenAI proxy.
            </p>
          </div>
          <div>
            <Badge tone={backendOpenAIReady ? 'success' : 'warning'}>
              {backendOpenAIReady ? 'Backend proxy ready' : 'Backend required'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4">
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
              { value: '1024x1024', label: '1024 x 1024' },
              { value: '1536x1024', label: '1536 x 1024' },
              { value: '1024x1536', label: '1024 x 1536' },
              { value: 'auto', label: 'Auto' },
            ]}
            onChange={(event) => update('size', event.target.value as OpenAIImageSettings['size'])}
          />
          <Select
            label="Final output resolution"
            name="finalImageResolution"
            value={settings.finalResolution}
            options={finalImageResolutionOptions}
            helperText="Applied after generation to saved images and exports. Higher resolutions create larger files."
            onChange={(event) =>
              update(
                'finalResolution',
                event.target.value as OpenAIImageSettings['finalResolution'],
              )
            }
          />
          <Select
            label="Quality"
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
        {transparentUnsupported ? (
          <Alert tone="warning">
            Transparent output needs GPT Image 1.x with PNG or WEBP. With `gpt-image-2`, requests
            use an opaque background.
          </Alert>
        ) : null}
        {settings.finalResolution !== 'native' ? (
          <Alert tone="info">
            OpenAI generation still uses the supported API size above. The app preserves aspect
            ratio and pads the result onto the selected final canvas before review, cloud autosave,
            and export.
          </Alert>
        ) : null}
        <Surface variant="muted" className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-strong">Estimated image cost</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Based on the selected size and quality. Actual OpenAI billing can vary.
              </p>
            </div>
            <Badge tone="neutral">
              {settings.quality} / {settings.size}
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
      </CardBody>
    </Card>
  );
};
