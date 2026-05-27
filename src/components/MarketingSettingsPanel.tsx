import { sanitizeMarketingSettings } from '../lib/marketingAssets';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Select } from './ui/Select';

import type { MarketingImageSettings, MarketingSettings, OpenAIImageSettings } from '../types';

type MarketingSettingsPanelProps = {
  settings: MarketingSettings;
  maskSettings: OpenAIImageSettings;
  onChange: (settings: MarketingSettings) => void;
};

const modelOptions = [
  { value: 'gpt-image-2', label: 'gpt-image-2' },
  { value: 'gpt-image-1.5', label: 'gpt-image-1.5' },
  { value: 'gpt-image-1', label: 'gpt-image-1' },
  { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini' },
];

const previewSizeOptions = [
  { value: '1024x1024', label: '1024 x 1024' },
  { value: '1536x1024', label: '1536 x 1024' },
  { value: '1024x1536', label: '1024 x 1536' },
  { value: 'auto', label: 'Auto' },
];

const qualityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'auto', label: 'Auto' },
];

const backgroundOptions = [
  { value: 'opaque', label: 'Opaque' },
  { value: 'auto', label: 'Auto' },
  { value: 'transparent', label: 'Transparent when supported' },
];

const outputFormatOptions = [
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'jpeg', label: 'JPEG' },
];

const updateImageSetting = <Key extends keyof MarketingImageSettings>(
  imageSettings: MarketingImageSettings,
  key: Key,
  value: MarketingImageSettings[Key],
) =>
  sanitizeMarketingSettings({
    slogan: '',
    preview: {
      mode: 'custom',
      customSettings: {
        ...imageSettings,
        [key]: value,
      },
    },
    additionalPrompt: '',
    childrenSceneSubjectIds: [],
  }).preview.customSettings;

export const MarketingSettingsPanel = ({
  settings,
  maskSettings,
  onChange,
}: MarketingSettingsPanelProps) => {
  const update = (nextSettings: MarketingSettings) => {
    onChange(sanitizeMarketingSettings(nextSettings));
  };
  const updatePreviewCustom = <Key extends keyof MarketingImageSettings>(
    key: Key,
    value: MarketingImageSettings[Key],
  ) => {
    update({
      ...settings,
      preview: {
        ...settings.preview,
        customSettings: updateImageSetting(settings.preview.customSettings, key, value),
      },
    });
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-bold text-ink-strong">Marketing asset generation</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Configure cost-controlled AI settings for listing graphics. Generated marketing
            suggestions are saved as usable assets immediately.
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          <section className="space-y-4 rounded-control border border-surface-outline bg-surface-raised p-4">
            <div>
              <h3 className="text-sm font-bold text-ink-strong">Marketing suggestions</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Defaults to {maskSettings.model} with a 1024 x 1024 size and{' '}
                {maskSettings.quality === 'high' ? 'medium cap' : maskSettings.quality} quality.
                High quality is not used for marketing assets.
              </p>
            </div>
            <Select
              label="Marketing settings"
              name="marketingPreviewMode"
              value={settings.preview.mode}
              options={[
                { value: 'inherit-mask', label: 'Mask model with 1024 marketing size' },
                { value: 'custom', label: 'Custom marketing settings' },
              ]}
              onChange={(event) =>
                update({
                  ...settings,
                  preview: {
                    ...settings.preview,
                    mode: event.target.value === 'custom' ? 'custom' : 'inherit-mask',
                  },
                })
              }
            />
            {settings.preview.mode === 'custom' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Marketing model"
                  name="marketingPreviewModel"
                  value={settings.preview.customSettings.model}
                  options={modelOptions}
                  onChange={(event) =>
                    updatePreviewCustom(
                      'model',
                      event.target.value as MarketingImageSettings['model'],
                    )
                  }
                />
                <Select
                  label="Marketing size"
                  name="marketingPreviewSize"
                  value={settings.preview.customSettings.size}
                  options={previewSizeOptions}
                  onChange={(event) =>
                    updatePreviewCustom(
                      'size',
                      event.target.value as MarketingImageSettings['size'],
                    )
                  }
                />
                <Select
                  label="Marketing quality"
                  name="marketingPreviewQuality"
                  value={settings.preview.customSettings.quality}
                  options={qualityOptions}
                  onChange={(event) =>
                    updatePreviewCustom(
                      'quality',
                      event.target.value as MarketingImageSettings['quality'],
                    )
                  }
                />
                <Select
                  label="Marketing background"
                  name="marketingPreviewBackground"
                  value={settings.preview.customSettings.background}
                  options={backgroundOptions}
                  onChange={(event) =>
                    updatePreviewCustom(
                      'background',
                      event.target.value as MarketingImageSettings['background'],
                    )
                  }
                />
                <Select
                  label="Marketing format"
                  name="marketingPreviewFormat"
                  value={settings.preview.customSettings.outputFormat}
                  options={outputFormatOptions}
                  onChange={(event) =>
                    updatePreviewCustom(
                      'outputFormat',
                      event.target.value as MarketingImageSettings['outputFormat'],
                    )
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </CardBody>
    </Card>
  );
};
