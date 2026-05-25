import { FileText, Images } from 'lucide-react';

import { Alert } from './ui/Alert';
import { IconButton } from './ui/IconButton';
import { Surface } from './ui/Surface';

import type { BusyAction } from '../types';

type OutputActionsPanelProps = {
  busyAction: BusyAction;
  canGenerateOutputs: boolean;
  pdfCount: number;
  previewCount: number;
  onGeneratePdfs: () => void;
  onGeneratePreviews: () => void;
};

export const OutputActionsPanel = ({
  busyAction,
  canGenerateOutputs,
  pdfCount,
  previewCount,
  onGeneratePdfs,
  onGeneratePreviews,
}: OutputActionsPanelProps) => {
  const disabled = busyAction !== null || !canGenerateOutputs;

  return (
    <Surface variant="muted" className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-ink-strong">Printable and marketplace outputs</h3>
          <p className="mt-1 text-sm text-ink-muted">
            PDFs: {pdfCount} • Previews: {previewCount}
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton
            icon={FileText}
            label="Generate printable PDFs"
            disabled={disabled}
            onClick={onGeneratePdfs}
          />
          <IconButton
            icon={Images}
            label="Generate marketplace previews"
            disabled={disabled}
            onClick={onGeneratePreviews}
          />
        </div>
      </div>
      {!canGenerateOutputs ? (
        <Alert tone="info" className="mt-4">
          Approve mapped images before generating buyer-ready output files.
        </Alert>
      ) : null}
    </Surface>
  );
};
