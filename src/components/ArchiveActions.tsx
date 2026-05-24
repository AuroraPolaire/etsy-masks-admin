import type { ChangeEvent } from 'react';
import type { QAResult } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';

type ArchiveActionsProps = {
  qaResult: QAResult;
  busyAction: string | null;
  onGeneratePdfs: () => void;
  onGeneratePreviews: () => void;
  onExportArchive: () => void;
  onExportProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
};

export const ArchiveActions = ({
  qaResult,
  busyAction,
  onGeneratePdfs,
  onGeneratePreviews,
  onExportArchive,
  onExportProjectJson,
  onImportProjectJson,
}: ArchiveActionsProps) => {
  const disabled = busyAction !== null;

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
          <h2 className="text-base font-bold text-slate-950">Archive actions</h2>
          <Badge tone={busyAction ? 'warning' : 'neutral'}>{busyAction ?? 'idle'}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <Button className="w-full" variant="primary" disabled={disabled} onClick={onGeneratePdfs}>
          Generate A4 + US Letter PDFs
        </Button>
        <Button className="w-full" variant="primary" disabled={disabled} onClick={onGeneratePreviews}>
          Generate marketplace preview images
        </Button>
        <Button className="w-full" disabled={disabled} onClick={onExportProjectJson}>
          Export project JSON
        </Button>
        <label className="block">
          <span className="sr-only">Import project JSON</span>
          <input className="sr-only" type="file" accept=".json,application/json" onChange={handleImport} />
          <span className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            Import project JSON
          </span>
        </label>
        <Button
          className="w-full"
          variant={qaResult.status === 'etsy-ready' ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={onExportArchive}
        >
          Export final ZIP archive
        </Button>
        {qaResult.status !== 'etsy-ready' ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Export is allowed, but the archive will be marked needs review until critical QA checks pass.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
};
