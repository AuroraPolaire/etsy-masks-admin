import { Download } from 'lucide-react';

import { formatCloudSaveDateTime, getSnapshotTitle } from './cloudSaveUtils';
import { formatBytes } from '../../lib/files';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';

import type { BackendProjectSnapshot } from '../../types';

type CloudRunPreviewProps = {
  snapshot: BackendProjectSnapshot | null;
  selectedRunId: string;
  backendBusy: boolean;
  backendReachable: boolean;
  cloudTotalBytes: number;
  onRestoreRun: (runId: string) => void;
};

export const CloudRunPreview = ({
  snapshot,
  selectedRunId,
  backendBusy,
  backendReachable,
  cloudTotalBytes,
  onRestoreRun,
}: CloudRunPreviewProps) => {
  const updatedAt = snapshot?.updatedAt ? formatCloudSaveDateTime(snapshot.updatedAt) : 'Never';
  const imageSettings = snapshot?.project?.openAIImageSettings;

  return (
    <Surface variant="muted" className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink-strong">Previewed run</h3>
          {snapshot?.status ? (
            <div className="mt-2">
              <Badge tone={snapshot.status === 'final' ? 'success' : 'info'}>
                {snapshot.status === 'final' ? 'Final run' : 'Draft run'}
              </Badge>
            </div>
          ) : null}
          <dl className="mt-3 grid gap-2 text-sm text-ink-base sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-ink-muted">Idea</dt>
              <dd className="mt-1 truncate font-semibold">{getSnapshotTitle(snapshot)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-muted">Last saved</dt>
              <dd className="mt-1 font-semibold">{updatedAt}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-muted">Files</dt>
              <dd className="mt-1 font-semibold">{snapshot?.files.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-muted">Size</dt>
              <dd className="mt-1 font-semibold">{formatBytes(cloudTotalBytes)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-muted">AI model</dt>
              <dd className="mt-1 font-semibold">{imageSettings?.model ?? 'Default'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-muted">AI output</dt>
              <dd className="mt-1 font-semibold">
                {imageSettings
                  ? `${imageSettings.quality} / ${imageSettings.size} / ${imageSettings.outputFormat}`
                  : 'Default'}
              </dd>
            </div>
          </dl>
        </div>
        <Button
          disabled={!backendReachable || backendBusy || !snapshot?.project}
          onClick={() => {
            if (selectedRunId) {
              onRestoreRun(selectedRunId);
            }
          }}
        >
          <Download aria-hidden="true" className="mr-2" size={17} />
          Restore previewed run
        </Button>
      </div>
    </Surface>
  );
};
