import { getOpenAIImageCostComparison, formatUsdEstimate } from '../lib/openaiImageCosts';
import { AIButton } from './ui/AIButton';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';

import type { OpenAIImageSettings } from '../types';

type OpenAIImagePanelProps = {
  settings: OpenAIImageSettings;
  missingImageCount: number;
  subjectCount: number;
  busy: boolean;
  onChange: (settings: OpenAIImageSettings) => void;
  onGenerateMissingImages: () => void;
};

export const OpenAIImagePanel = ({
  settings,
  missingImageCount,
  subjectCount,
  busy,
  onChange,
  onGenerateMissingImages,
}: OpenAIImagePanelProps) => {
  const update = <Key extends keyof OpenAIImageSettings>(
    key: Key,
    value: OpenAIImageSettings[Key],
  ) => {
    onChange({ ...settings, [key]: value });
  };
  const hasApiKey = settings.apiKey.trim().length > 0;
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
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">OpenAI image generation</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Test one mask from a topic card, or generate the remaining bundle here. Review and
              approve every image before export.
            </p>
          </div>
          <Badge tone={hasApiKey ? 'success' : 'warning'}>
            {hasApiKey ? 'Session key ready' : 'API key required'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input
          label="OpenAI API key for this session"
          name="openaiApiKey"
          type="password"
          autoComplete="off"
          value={settings.apiKey}
          helperText="Stored only in React state. Reused for AI brief drafting and image generation. It is not saved to localStorage, project JSON, manifests, or ZIP files."
          onChange={(event) => update('apiKey', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Image model"
            name="openaiModel"
            value={settings.model}
            options={[
              { value: 'gpt-image-1.5', label: 'gpt-image-1.5 (print mask recommended)' },
              { value: 'gpt-image-1', label: 'gpt-image-1' },
              { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini' },
              { value: 'gpt-image-2', label: 'gpt-image-2 (no transparent background)' },
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
            label="Quality"
            name="openaiQuality"
            value={settings.quality}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
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
              { value: 'opaque', label: 'Opaque white print background' },
              { value: 'transparent', label: 'Transparent cutout' },
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
            Transparent mask assets require a GPT Image 1.x model with PNG or WEBP output. For
            `gpt-image-2`, this app sends an opaque background request.
          </Alert>
        ) : null}
        <Surface variant="muted" className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-strong">Approximate generation cost</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Estimated from selected quality and size. Actual API billing can vary with token
                usage and OpenAI pricing changes. Switch the selected model above before generating.
              </p>
            </div>
            <Badge tone="neutral">
              {settings.quality} / {settings.size}
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                </dl>
              </Surface>
            ))}
          </div>
          {hasCostFallbackAssumption ? (
            <p className="mt-3 text-xs text-ink-muted">
              Auto settings are estimated as medium quality at 1024 x 1024.
            </p>
          ) : null}
        </Surface>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AIButton
            disabled={!hasApiKey || missingImageCount === 0 || busy}
            onClick={onGenerateMissingImages}
          >
            Generate remaining bundle
          </AIButton>
          <p className="text-sm text-ink-muted">
            {missingImageCount} topic{missingImageCount === 1 ? '' : 's'} missing a usable image.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
