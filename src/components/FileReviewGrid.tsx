import { MAX_TOTAL_SOURCE_BYTES } from '../constants';
import { FilePreviewCard } from './FilePreviewCard';
import { formatBytes, getSourceFiles } from '../lib/files';
import { Alert } from './ui/Alert';
import { Card, CardBody, CardHeader } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

import type { SubjectItem, ManagedFile } from '../types';

type FileReviewGridProps = {
  files: ManagedFile[];
  subjects: SubjectItem[];
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onMap: (fileId: string, subjectId: string | undefined) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onConfirmReview: (fileId: string) => void;
};

export const FileReviewGrid = ({
  files,
  subjects,
  onApprove,
  onReject,
  onDelete,
  onMap,
  onNotesChange,
  onConfirmReview,
}: FileReviewGridProps) => {
  const sourceFiles = getSourceFiles(files);
  const sourceTotal = sourceFiles.reduce((total, file) => total + file.size, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Review files</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Approve, reject, map, and annotate uploaded images before generating outputs.
            </p>
          </div>
          <p className="text-sm font-semibold text-ink-base">
            {files.length} files • {formatBytes(sourceTotal)} uploaded
          </p>
        </div>
      </CardHeader>
      <CardBody>
        {sourceTotal > MAX_TOTAL_SOURCE_BYTES ? (
          <Alert tone="warning" className="mb-4">
            Total uploaded source files exceed 150MB. Browser ZIP/PDF generation can become slow or
            crash with very large files.
          </Alert>
        ) : null}
        {files.length === 0 ? (
          <EmptyState>
            Upload generated masks to start reviewing. Filename matches are mapped automatically,
            and mismatches can be repaired with the topic dropdown.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <FilePreviewCard
                key={file.id}
                file={file}
                subjects={subjects}
                onApprove={onApprove}
                onReject={onReject}
                onDelete={onDelete}
                onMap={onMap}
                onNotesChange={onNotesChange}
                onConfirmReview={onConfirmReview}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
