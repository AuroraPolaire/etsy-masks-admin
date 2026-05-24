import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

import type { PdfSettings } from '../types';

type PdfSettingsPanelProps = {
  settings: PdfSettings;
  onChange: (settings: PdfSettings) => void;
};

export const PdfSettingsPanel = ({ settings, onChange }: PdfSettingsPanelProps) => {
  const update = <Key extends keyof PdfSettings>(key: Key, value: PdfSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold text-slate-950">PDF settings</h2>
      </CardHeader>
      <CardBody className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.generateA4}
              onChange={(event) => update('generateA4', event.target.checked)}
            />
            Generate A4
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.generateUSLetter}
              onChange={(event) => update('generateUSLetter', event.target.checked)}
            />
            Generate US Letter
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.showSubjectLabel}
              onChange={(event) => update('showSubjectLabel', event.target.checked)}
            />
            Show topic label
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.showInstructionFooter}
              onChange={(event) => update('showInstructionFooter', event.target.checked)}
            />
            Show instruction footer
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.includeCalibrationPage}
              onChange={(event) => update('includeCalibrationPage', event.target.checked)}
            />
            Include calibration page
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Mask scale"
            name="maskScale"
            value={settings.maskScale}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
            onChange={(event) =>
              update('maskScale', event.target.value as PdfSettings['maskScale'])
            }
          />
          <Input
            label="Page margin in mm"
            name="pageMarginMm"
            type="number"
            min={5}
            max={30}
            value={settings.pageMarginMm}
            onChange={(event) => update('pageMarginMm', Number(event.target.value))}
          />
        </div>
      </CardBody>
    </Card>
  );
};
