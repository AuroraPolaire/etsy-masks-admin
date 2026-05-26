import { Download, FileText } from 'lucide-react';

import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Surface } from './ui/Surface';

import type { BusyAction, QAResult } from '../types';

type ArchiveActionsProps = {
  qaResult: QAResult;
  busyAction: BusyAction;
  onExportArchive: () => void;
  canExportFinalFiles: boolean;
};

export const ArchiveActions = ({
  qaResult,
  busyAction,
  onExportArchive,
  canExportFinalFiles,
}: ArchiveActionsProps) => {
  const disabled = busyAction !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink-strong">Export package</h2>
          <Badge tone={busyAction ? 'warning' : 'neutral'}>{busyAction ?? 'ready'}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {!canExportFinalFiles ? (
          <Alert tone="info">Approve at least one topic image before exporting the ZIP.</Alert>
        ) : null}
        <Surface variant="muted" className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-strong">ZIP package</p>
              <p className="mt-1 text-xs text-ink-muted">
                Exports color mask PNGs, coloring-page PNGs, and one listing details PDF.
              </p>
            </div>
            <FileText aria-hidden="true" className="shrink-0 text-ink-muted" size={20} />
          </div>
        </Surface>
        <Button
          className="w-full"
          variant={qaResult.status === 'etsy-ready' ? 'primary' : 'secondary'}
          disabled={disabled || !canExportFinalFiles}
          onClick={onExportArchive}
        >
          <Download aria-hidden="true" className="mr-2" size={17} />
          Export ZIP
        </Button>
        {qaResult.status !== 'etsy-ready' ? (
          <Alert tone="warning">
            You can export now, but the archive stays marked needs review until blockers are fixed.
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
};
