import { useMemo, useState } from 'react';

import { CloudDangerZone } from './cloud-saves/CloudDangerZone';
import { CloudDiagnostics } from './cloud-saves/CloudDiagnostics';
import { CloudRunPreview } from './cloud-saves/CloudRunPreview';
import { CloudSaveRunPanel } from './cloud-saves/CloudSaveRunPanel';
import { filterRuns } from './cloud-saves/cloudSaveUtils';
import { SavedRunsTable } from './cloud-saves/SavedRunsTable';

import type {
  BackendHealth,
  BackendAutosaveState,
  BackendProjectSnapshot,
  BackendRunSummary,
  BusyAction,
  ManagedFile,
} from '../types';

type BackendDataPanelProps = {
  health: BackendHealth | null;
  runs: BackendRunSummary[];
  selectedRunId: string;
  activeDraftRunId: string;
  autosaveState: BackendAutosaveState;
  snapshot: BackendProjectSnapshot | null;
  saveIdea: string;
  suggestedIdea: string;
  files: ManagedFile[];
  busyAction: BusyAction;
  onSaveIdeaChange: (idea: string) => void;
  onRunSelected: (runId: string) => void;
  onRestoreRun: (runId: string) => void;
  onTestConnection: () => void;
  onBackupToCloud: () => void;
  onFinalizeRun: () => void;
  onDeleteSelectedRun: () => void;
  onDeleteAllCloudData: () => void;
};

export const BackendDataPanel = ({
  health,
  runs,
  selectedRunId,
  activeDraftRunId,
  autosaveState,
  snapshot,
  saveIdea,
  suggestedIdea,
  files,
  busyAction,
  onSaveIdeaChange,
  onRunSelected,
  onRestoreRun,
  onTestConnection,
  onBackupToCloud,
  onFinalizeRun,
  onDeleteSelectedRun,
  onDeleteAllCloudData,
}: BackendDataPanelProps) => {
  const [runSearchQuery, setRunSearchQuery] = useState('');
  const backendBusy = busyAction === 'backend-sync';
  const backendReachable = Boolean(health?.ok);
  const localTotalBytes = files.reduce((total, file) => total + file.size, 0);
  const maxFileBytes = health?.maxFileBytes ?? 50 * 1024 * 1024;
  const oversizedFiles = files.filter((file) => file.size > maxFileBytes);
  const cloudTotalBytes = snapshot?.files.reduce((total, file) => total + file.size, 0) ?? 0;
  const filteredRuns = useMemo(() => filterRuns(runs, runSearchQuery), [runSearchQuery, runs]);
  const selectedRun = runs.find((run) => run.id === selectedRunId);

  return (
    <div className="space-y-6">
      <CloudSaveRunPanel
        health={health}
        saveIdea={saveIdea}
        suggestedIdea={suggestedIdea}
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        activeDraftRunId={activeDraftRunId}
        autosaveState={autosaveState}
        maxFileBytes={maxFileBytes}
        oversizedFiles={oversizedFiles}
        onSaveIdeaChange={onSaveIdeaChange}
        onTestConnection={onTestConnection}
        onBackupToCloud={onBackupToCloud}
        onFinalizeRun={onFinalizeRun}
      />
      <SavedRunsTable
        runs={runs}
        filteredRuns={filteredRuns}
        selectedRunId={selectedRunId}
        runSearchQuery={runSearchQuery}
        backendBusy={backendBusy}
        onRunSearchChange={setRunSearchQuery}
        onRunSelected={onRunSelected}
        onRestoreRun={onRestoreRun}
      />
      <CloudRunPreview
        snapshot={snapshot}
        selectedRunId={selectedRunId}
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        cloudTotalBytes={cloudTotalBytes}
        onRestoreRun={onRestoreRun}
      />
      <CloudDiagnostics
        health={health}
        runs={runs}
        files={files}
        localTotalBytes={localTotalBytes}
        cloudTotalBytes={cloudTotalBytes}
        maxFileBytes={maxFileBytes}
        events={snapshot?.events ?? []}
      />
      <CloudDangerZone
        runs={runs}
        selectedRun={selectedRun}
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        onDeleteSelectedRun={onDeleteSelectedRun}
        onDeleteAllCloudData={onDeleteAllCloudData}
      />
    </div>
  );
};
