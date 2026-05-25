import { Card, CardBody, CardHeader } from './ui/Card';
import { CheckboxCard } from './ui/CheckboxCard';
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
        <h2 className="text-lg font-bold text-ink-strong">PDF output settings</h2>
      </CardHeader>
      <CardBody className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxCard
            label="A4 PDF"
            name="generateA4"
            checked={settings.generateA4}
            onChange={(event) => update('generateA4', event.target.checked)}
          />
          <CheckboxCard
            label="US Letter PDF"
            name="generateUSLetter"
            checked={settings.generateUSLetter}
            onChange={(event) => update('generateUSLetter', event.target.checked)}
          />
          <CheckboxCard
            label="Show topic name"
            name="showSubjectLabel"
            checked={settings.showSubjectLabel}
            onChange={(event) => update('showSubjectLabel', event.target.checked)}
          />
          <CheckboxCard
            label="Instruction footer"
            name="showInstructionFooter"
            checked={settings.showInstructionFooter}
            onChange={(event) => update('showInstructionFooter', event.target.checked)}
          />
          <CheckboxCard
            label="Calibration page"
            name="includeCalibrationPage"
            checked={settings.includeCalibrationPage}
            onChange={(event) => update('includeCalibrationPage', event.target.checked)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Mask size on page"
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
            label="Page margin (mm)"
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
