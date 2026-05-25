import { CheckCircle2, Clock3, FileArchive, Image, PackageCheck } from 'lucide-react';

import { formatBytes } from '../lib/files';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { Surface } from './ui/Surface';

import type { ManagedFile, Project, QAResult } from '../types';
import type { WorkflowState } from '../workflow/workflowState';

type InsightsPanelProps = {
  project: Project;
  files: ManagedFile[];
  qaResult: QAResult;
  workflow: WorkflowState;
};

const formatOptionalDateTime = (value: string | undefined): string => {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatStatusLabel = (complete: boolean): string => (complete ? 'Ready' : 'Needs work');

export const InsightsPanel = ({ project, files, qaResult, workflow }: InsightsPanelProps) => {
  const uploadedFileCount = files.filter((file) => file.kind === 'uploaded').length;
  const approvedImageCount = files.filter((file) => file.reviewState === 'approved').length;
  const pendingImageCount = files.filter((file) => file.reviewState === 'pending').length;
  const rejectedImageCount = files.filter((file) => file.reviewState === 'rejected').length;
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const timeline = [
    { label: 'Project created', value: project.createdAt },
    { label: 'Brief updated', value: project.lastBriefUpdatedAt },
    { label: 'Image approved', value: project.lastImageApprovalAt },
    { label: 'PDFs generated', value: project.lastPdfGeneratedAt },
    { label: 'Previews generated', value: project.lastPreviewGeneratedAt },
    { label: 'Project JSON exported', value: project.lastProjectJsonExportAt },
    { label: 'Archive exported', value: project.lastArchiveExportAt },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">Current project snapshot</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Live readiness, asset counts, and save/export timestamps for the current browser
                session.
              </p>
            </div>
            <Badge tone={qaResult.status === 'etsy-ready' ? 'success' : 'warning'}>
              {qaResult.readinessPercentage}% ready
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Topics" value={workflow.subjectCount} />
            <StatCard
              label="Approved images"
              value={`${workflow.approvedImageCount}/${workflow.subjectCount}`}
            />
            <StatCard label="PDFs" value={workflow.pdfCount} />
            <StatCard label="Previews" value={workflow.previewCount} />
          </dl>
          <Surface variant="muted" className="p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <PackageCheck aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Next action</h3>
                  <p className="mt-1 text-sm text-ink-muted">{workflow.nextAction}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Image aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Image review</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {approvedImageCount} approved, {pendingImageCount} pending, {rejectedImageCount}{' '}
                    rejected.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileArchive aria-hidden="true" className="mt-0.5 text-brand-strong" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">Session files</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {uploadedFileCount} uploaded, {files.length} total, {formatBytes(totalBytes)}.
                  </p>
                </div>
              </div>
            </div>
          </Surface>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink-strong">Workflow readiness</h2>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-3 md:grid-cols-2">
            {workflow.steps.map((step) => (
              <li
                key={step.id}
                className="rounded-control border border-surface-outline bg-surface-muted p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink-strong">{step.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{step.summary}</p>
                  </div>
                  <Badge tone={step.complete ? 'success' : step.unlocked ? 'warning' : 'neutral'}>
                    {step.unlocked ? formatStatusLabel(step.complete) : 'Locked'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-bold text-ink-strong">Local save and export history</h2>
        </CardHeader>
        <CardBody>
          <ul className="grid gap-3 md:grid-cols-2">
            {timeline.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-3 rounded-control border border-surface-outline bg-surface-muted p-3"
              >
                {item.value ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 text-feedback-success-fg" />
                ) : (
                  <Clock3 aria-hidden="true" className="mt-0.5 text-ink-muted" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-ink-strong">{item.label}</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatOptionalDateTime(item.value)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
};
