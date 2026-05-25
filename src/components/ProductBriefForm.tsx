import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';

import type { ProjectSettings } from '../types';

type ProductBriefFormProps = {
  settings: ProjectSettings;
  lastSavedAt?: string;
  onChange: (settings: ProjectSettings) => void;
};

const formatSavedAt = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const ProductBriefForm = ({ settings, lastSavedAt, onChange }: ProductBriefFormProps) => {
  const update = <Key extends keyof ProjectSettings>(key: Key, value: ProjectSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-bold text-ink-strong">Listing brief</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Buyer-facing copy is saved in this browser. Uploaded files stay in memory only.
          </p>
          {lastSavedAt ? (
            <p className="mt-1 text-xs text-ink-muted">
              Last saved locally: {formatSavedAt(lastSavedAt)}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardBody className="grid gap-4">
        <Input
          label="Listing title"
          name="title"
          value={settings.title}
          onChange={(event) => update('title', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Bundle theme"
            name="theme"
            value={settings.theme}
            onChange={(event) => update('theme', event.target.value)}
          />
          <Input
            label="Target buyer"
            name="audience"
            value={settings.audience}
            onChange={(event) => update('audience', event.target.value)}
          />
          <Select
            label="Marketplace"
            name="marketplace"
            value={settings.marketplace}
            options={[
              { value: 'Etsy', label: 'Etsy' },
              { value: 'Other', label: 'Other' },
            ]}
            onChange={(event) =>
              update('marketplace', event.target.value as ProjectSettings['marketplace'])
            }
          />
          <Input
            label="Visual style"
            name="style"
            value={settings.style}
            onChange={(event) => update('style', event.target.value)}
          />
        </div>
        <Textarea
          label="Listing description"
          name="description"
          rows={5}
          value={settings.description}
          onChange={(event) => update('description', event.target.value)}
        />
        <Textarea
          label="Etsy tags"
          name="tags"
          rows={3}
          helperText="Use comma-separated Etsy tags."
          value={settings.tags}
          onChange={(event) => update('tags', event.target.value)}
        />
        <Textarea
          label="Safety note"
          name="safetyNote"
          rows={3}
          value={settings.safetyNote}
          onChange={(event) => update('safetyNote', event.target.value)}
        />
        <Textarea
          label="Print instructions"
          name="printingInstructions"
          rows={3}
          value={settings.printingInstructions}
          onChange={(event) => update('printingInstructions', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Textarea
            label="Usage license"
            name="license"
            rows={4}
            value={settings.license}
            onChange={(event) => update('license', event.target.value)}
          />
          <Textarea
            label="Refund note"
            name="refundPolicy"
            rows={4}
            value={settings.refundPolicy}
            onChange={(event) => update('refundPolicy', event.target.value)}
          />
        </div>
      </CardBody>
    </Card>
  );
};
