import { RefreshCw, Upload } from 'lucide-react';

import { formatBytes } from '../../lib/files';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';

import type { BackendHealth, ManagedFile } from '../../types';
import type { BadgeTone } from '../ui/Badge';

type CloudSaveRunPanelProps = {
  health: BackendHealth | null;
  saveIdea: string;
  suggestedIdea: string;
  backendBusy: boolean;
  backendReachable: boolean;
  maxFileBytes: number;
  oversizedFiles: ManagedFile[];
  onSaveIdeaChange: (idea: string) => void;
  onTestConnection: () => void;
  onBackupToCloud: () => void;
};

export const CloudSaveRunPanel = ({
  health,
  saveIdea,
  suggestedIdea,
  backendBusy,
  backendReachable,
  maxFileBytes,
  oversizedFiles,
  onSaveIdeaChange,
  onTestConnection,
  onBackupToCloud,
}: CloudSaveRunPanelProps) => {
  const statusTone: BadgeTone = backendReachable ? 'success' : health ? 'warning' : 'neutral';
  const statusLabel = backendReachable
    ? 'Cloud saves reachable'
    : health
      ? 'Needs attention'
      : 'Not checked';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Save current run</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Store the current brief, topics, approved files, PDFs, and previews so this run can be
              restored later.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <Badge tone={health?.openaiProxyReady ? 'success' : 'warning'}>
              {health?.openaiProxyReady ? 'AI ready' : 'AI not ready'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Input
            label="Run idea label"
            name="backendRunIdea"
            type="text"
            value={saveIdea}
            placeholder={suggestedIdea}
            helperText="Use a short idea name that will be easy to find later."
            onChange={(event) => onSaveIdeaChange(event.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={backendBusy} onClick={onTestConnection}>
              <RefreshCw aria-hidden="true" className="mr-2" size={17} />
              Refresh
            </Button>
            <Button
              variant="primary"
              disabled={!backendReachable || backendBusy || oversizedFiles.length > 0}
              onClick={onBackupToCloud}
            >
              <Upload aria-hidden="true" className="mr-2" size={17} />
              Save run
            </Button>
          </div>
        </div>
        {!backendReachable && health ? (
          <Alert tone="warning">
            Cloud saves are not ready. Check the Worker route, Cloudflare Access, and D1/R2
            bindings.
          </Alert>
        ) : null}
        {oversizedFiles.length > 0 ? (
          <Alert tone="warning">
            {oversizedFiles.length} file{oversizedFiles.length === 1 ? '' : 's'} exceed the{' '}
            {formatBytes(maxFileBytes)} cloud-save limit. Remove or shrink them before saving.
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
};
