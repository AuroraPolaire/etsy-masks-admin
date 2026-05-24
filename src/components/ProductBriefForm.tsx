import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';

import type { ProjectSettings } from '../types';

type ProductBriefFormProps = {
  settings: ProjectSettings;
  onChange: (settings: ProjectSettings) => void;
};

export const ProductBriefForm = ({ settings, onChange }: ProductBriefFormProps) => {
  const update = <Key extends keyof ProjectSettings>(key: Key, value: ProjectSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Product brief</h2>
          <p className="mt-1 text-sm text-slate-600">
            Listing copy is saved in this browser. Uploaded files are kept in memory only.
          </p>
        </div>
      </CardHeader>
      <CardBody className="grid gap-4">
        <Input
          label="Title"
          name="title"
          value={settings.title}
          onChange={(event) => update('title', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Theme"
            name="theme"
            value={settings.theme}
            onChange={(event) => update('theme', event.target.value)}
          />
          <Input
            label="Audience"
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
            label="Style"
            name="style"
            value={settings.style}
            onChange={(event) => update('style', event.target.value)}
          />
        </div>
        <Textarea
          label="Description"
          name="description"
          rows={5}
          value={settings.description}
          onChange={(event) => update('description', event.target.value)}
        />
        <Textarea
          label="Tags"
          name="tags"
          rows={3}
          helperText="Comma-separated Etsy-style tags."
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
          label="Printing instructions"
          name="printingInstructions"
          rows={3}
          value={settings.printingInstructions}
          onChange={(event) => update('printingInstructions', event.target.value)}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Textarea
            label="License"
            name="license"
            rows={4}
            value={settings.license}
            onChange={(event) => update('license', event.target.value)}
          />
          <Textarea
            label="Refund policy"
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
