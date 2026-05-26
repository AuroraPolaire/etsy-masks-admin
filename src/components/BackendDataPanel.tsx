import { useMemo, useState } from 'react';

import { CloudDangerZone } from './cloud-saves/CloudDangerZone';
import { CloudDiagnostics } from './cloud-saves/CloudDiagnostics';
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
  onDeleteRun: (runId: string) => void;
  onDeleteAllCloudData: () => void;
};

export const BackendDataPanel = ({
  health,
  runs,
  selectedRunId,
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
  onDeleteRun,
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

  return (
    <div className="space-y-6">
      <CloudSaveRunPanel
        health={health}
        saveIdea={saveIdea}
        suggestedIdea={suggestedIdea}
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        autosaveState={autosaveState}
        maxFileBytes={maxFileBytes}
        oversizedFiles={oversizedFiles}
        onSaveIdeaChange={onSaveIdeaChange}
        onTestConnection={onTestConnection}
      />
      <SavedRunsTable
        runs={runs}
        filteredRuns={filteredRuns}
        selectedRunId={selectedRunId}
        snapshot={snapshot}
        runSearchQuery={runSearchQuery}
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        onRunSearchChange={setRunSearchQuery}
        onRunSelected={onRunSelected}
        onRestoreRun={onRestoreRun}
        onDeleteRun={onDeleteRun}
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
        backendBusy={backendBusy}
        backendReachable={backendReachable}
        onDeleteAllCloudData={onDeleteAllCloudData}
      />
    </div>
  );
};
