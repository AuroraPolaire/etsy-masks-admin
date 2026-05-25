import { getFileForSubject } from '../lib/files';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';

import type { ManagedFile, Project, QAResult } from '../types';

type WorkflowStatusProps = {
  project: Project;
  files: ManagedFile[];
  qaResult: QAResult;
  hasOpenAIKey: boolean;
};

export const WorkflowStatus = ({ project, files, qaResult, hasOpenAIKey }: WorkflowStatusProps) => {
  const approvedCount = project.subjects.filter((subject) =>
    getFileForSubject(files, subject.id),
  ).length;
  const pdfCount = files.filter((file) => file.kind === 'generated-pdf').length;
  const previewCount = files.filter((file) => file.kind === 'generated-preview').length;
  const nextStep = !hasOpenAIKey
    ? 'Paste a session OpenAI API key.'
    : approvedCount < project.subjects.length
      ? 'Generate and approve missing mask images.'
      : pdfCount === 0
        ? 'Generate printable PDFs.'
        : previewCount < 5
          ? 'Generate marketplace preview images.'
          : qaResult.status === 'etsy-ready'
            ? 'Export the final ZIP archive.'
            : 'Review the QA panel.';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-strong">Workflow</h2>
          <Badge tone={qaResult.status === 'etsy-ready' ? 'success' : 'warning'}>
            {qaResult.readinessPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <Alert tone="brand" className="font-semibold">
          Next: {nextStep}
        </Alert>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <StatCard label="Images" value={`${approvedCount}/${project.subjects.length}`} />
          <StatCard label="PDFs" value={pdfCount} />
          <StatCard label="Previews" value={previewCount} />
        </dl>
      </CardBody>
    </Card>
  );
};
