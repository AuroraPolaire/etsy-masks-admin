import { getFileForSubject } from '../lib/files';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';

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
          <h2 className="text-base font-bold text-slate-950">Workflow</h2>
          <Badge tone={qaResult.status === 'etsy-ready' ? 'success' : 'warning'}>
            {qaResult.readinessPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="rounded-md border border-teal-100/80 bg-teal-50/75 p-3 text-sm font-semibold text-teal-950">
          Next: {nextStep}
        </p>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md border border-white/70 bg-white/45 p-2">
            <dt className="text-xs text-slate-500">Images</dt>
            <dd className="font-bold text-slate-950">
              {approvedCount}/{project.subjects.length}
            </dd>
          </div>
          <div className="rounded-md border border-white/70 bg-white/45 p-2">
            <dt className="text-xs text-slate-500">PDFs</dt>
            <dd className="font-bold text-slate-950">{pdfCount}</dd>
          </div>
          <div className="rounded-md border border-white/70 bg-white/45 p-2">
            <dt className="text-xs text-slate-500">Previews</dt>
            <dd className="font-bold text-slate-950">{previewCount}</dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
};
