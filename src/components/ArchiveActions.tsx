import { Download, FileInput, FileJson, FileText, Images } from 'lucide-react';

import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { Surface } from './ui/Surface';

import type { BusyAction, QAResult } from '../types';
import type { ChangeEvent } from 'react';

type ArchiveActionsProps = {
  qaResult: QAResult;
  busyAction: BusyAction;
  onGeneratePdfs: () => void;
  onGeneratePreviews: () => void;
  onExportArchive: () => void;
  onExportProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
  canGenerateOutputs: boolean;
  pdfCount: number;
  previewCount: number;
};

export const ArchiveActions = ({
  qaResult,
  busyAction,
  onGeneratePdfs,
  onGeneratePreviews,
  onExportArchive,
  onExportProjectJson,
  onImportProjectJson,
  canGenerateOutputs,
  pdfCount,
  previewCount,
}: ArchiveActionsProps) => {
  const disabled = busyAction !== null;
  const outputActionsDisabled = disabled || !canGenerateOutputs;

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportProjectJson(file);
    }
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink-strong">Final package</h2>
          <Badge tone={busyAction ? 'warning' : 'neutral'}>{busyAction ?? 'idle'}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {!canGenerateOutputs ? (
          <Alert tone="info">
            Approve at least one mapped image to generate PDFs and previews.
          </Alert>
        ) : null}
        <Surface variant="muted" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-strong">Build outputs</p>
              <p className="mt-1 text-xs text-ink-muted">
                PDFs: {pdfCount} • Previews: {previewCount}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <IconButton
                icon={FileText}
                label="Generate printable PDFs"
                disabled={outputActionsDisabled}
                onClick={onGeneratePdfs}
              />
              <IconButton
                icon={Images}
                label="Generate marketplace previews"
                disabled={outputActionsDisabled}
                onClick={onGeneratePreviews}
              />
            </div>
          </div>
        </Surface>
        <Surface variant="muted" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-strong">Project backup</p>
              <p className="mt-1 text-xs text-ink-muted">JSON metadata only, no uploaded files.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <IconButton
                icon={FileJson}
                label="Export project JSON"
                disabled={disabled}
                onClick={onExportProjectJson}
              />
              <label>
                <span className="sr-only">Import project JSON</span>
                <input
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  disabled={disabled}
                  onChange={handleImport}
                />
                <span
                  className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-control border border-surface-outline bg-surface-raised text-ink-base shadow-sm transition hover:bg-surface-muted ${
                    disabled ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  title="Import project JSON"
                  aria-label="Import project JSON"
                >
                  <FileInput aria-hidden="true" size={18} strokeWidth={2.2} />
                </span>
              </label>
            </div>
          </div>
        </Surface>
        <Button
          className="w-full"
          variant={qaResult.status === 'etsy-ready' ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={onExportArchive}
        >
          <Download aria-hidden="true" className="mr-2" size={17} />
          Export final ZIP
        </Button>
        {qaResult.status !== 'etsy-ready' ? (
          <Alert tone="warning">
            Export is allowed, but the archive will be marked needs review until critical QA checks
            pass.
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
};
