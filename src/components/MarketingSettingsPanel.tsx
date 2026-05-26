import { sanitizeMarketingSettings } from '../lib/marketingAssets';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
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

const finalSizeOptions = [
  { value: '2048x2048', label: '2048 x 2048' },
  { value: '2048x1152', label: '2048 x 1152' },
  { value: '1152x2048', label: '1152 x 2048' },
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
    final: imageSettings,
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
  const updateFinal = <Key extends keyof MarketingImageSettings>(
    key: Key,
    value: MarketingImageSettings[Key],
  ) => {
    update({
      ...settings,
      final: updateImageSetting(settings.final, key, value),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-bold text-ink-strong">Marketing asset generation</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Configure cost-controlled preview and final settings. High quality is not used for
            marketing assets.
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          <Input
            label="Marketing slogan"
            name="marketingSlogan"
            value={settings.slogan}
            placeholder="30 printable dinosaur masks for kids"
            helperText="Used on slogan poster assets. If empty, the listing title is used."
            onChange={(event) => update({ ...settings, slogan: event.target.value })}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-4 rounded-control border border-surface-outline bg-surface-raised p-4">
              <div>
                <h3 className="text-sm font-bold text-ink-strong">Preview generation</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Defaults to the mask settings: {maskSettings.model}, {maskSettings.size},{' '}
                  {maskSettings.quality === 'high' ? 'medium cap' : maskSettings.quality}.
                </p>
              </div>
              <Select
                label="Preview settings"
                name="marketingPreviewMode"
                value={settings.preview.mode}
                options={[
                  { value: 'inherit-mask', label: 'Same as mask settings' },
                  { value: 'custom', label: 'Custom marketing preview settings' },
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
                    label="Preview model"
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
                    label="Preview size"
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
                    label="Preview quality"
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
                    label="Preview background"
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
                    label="Preview format"
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
            <section className="space-y-4 rounded-control border border-surface-outline bg-surface-raised p-4">
              <div>
                <h3 className="text-sm font-bold text-ink-strong">Final asset generation</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Use a larger size for approved assets while keeping quality capped at medium.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Final model"
                  name="marketingFinalModel"
                  value={settings.final.model}
                  options={modelOptions}
                  onChange={(event) =>
                    updateFinal('model', event.target.value as MarketingImageSettings['model'])
                  }
                />
                <Select
                  label="Final size"
                  name="marketingFinalSize"
                  value={settings.final.size}
                  options={finalSizeOptions}
                  onChange={(event) =>
                    updateFinal('size', event.target.value as MarketingImageSettings['size'])
                  }
                />
                <Select
                  label="Final quality"
                  name="marketingFinalQuality"
                  value={settings.final.quality}
                  options={qualityOptions}
                  onChange={(event) =>
                    updateFinal('quality', event.target.value as MarketingImageSettings['quality'])
                  }
                />
                <Select
                  label="Final background"
                  name="marketingFinalBackground"
                  value={settings.final.background}
                  options={backgroundOptions}
                  onChange={(event) =>
                    updateFinal(
                      'background',
                      event.target.value as MarketingImageSettings['background'],
                    )
                  }
                />
                <Select
                  label="Final format"
                  name="marketingFinalFormat"
                  value={settings.final.outputFormat}
                  options={outputFormatOptions}
                  onChange={(event) =>
                    updateFinal(
                      'outputFormat',
                      event.target.value as MarketingImageSettings['outputFormat'],
                    )
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
