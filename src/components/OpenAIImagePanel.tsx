import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

import type { OpenAIImageSettings } from '../types';

type OpenAIImagePanelProps = {
  settings: OpenAIImageSettings;
  missingImageCount: number;
  busy: boolean;
  onChange: (settings: OpenAIImageSettings) => void;
  onGenerateMissingImages: () => void;
};

export const OpenAIImagePanel = ({
  settings,
  missingImageCount,
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
  const transparentReady =
    settings.model !== 'gpt-image-2' &&
    settings.background === 'transparent' &&
    (settings.outputFormat === 'png' || settings.outputFormat === 'webp');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">OpenAI image generation</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste an API key for this browser session, generate masks, then review before export.
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
          helperText="Stored only in React state. It is not saved to localStorage, project JSON, manifests, or ZIP files."
          onChange={(event) => update('apiKey', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Image model"
            name="openaiModel"
            value={settings.model}
            options={[
              { value: 'gpt-image-1.5', label: 'gpt-image-1.5 (transparent PNG recommended)' },
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
              { value: 'transparent', label: 'Transparent' },
              { value: 'opaque', label: 'Opaque' },
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
        {!transparentReady ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Transparent mask assets require a GPT Image 1.x model with PNG or WEBP output. For
            `gpt-image-2`, this app sends an opaque background request.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            disabled={!hasApiKey || missingImageCount === 0 || busy}
            onClick={onGenerateMissingImages}
          >
            Generate missing images
          </Button>
          <p className="text-sm text-slate-600">
            {missingImageCount} animal{missingImageCount === 1 ? '' : 's'} missing a usable image.
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
