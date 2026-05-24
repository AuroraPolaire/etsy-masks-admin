import { MAX_TOTAL_SOURCE_BYTES } from '../constants';
import { FilePreviewCard } from './FilePreviewCard';
import { formatBytes, getSourceFiles } from '../lib/files';
import { Card, CardBody, CardHeader } from './ui/Card';

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
            <h2 className="text-lg font-bold text-slate-950">Review files</h2>
            <p className="mt-1 text-sm text-slate-600">
              Approve, reject, map, and annotate uploaded images before generating outputs.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {files.length} files • {formatBytes(sourceTotal)} uploaded
          </p>
        </div>
      </CardHeader>
      <CardBody>
        {sourceTotal > MAX_TOTAL_SOURCE_BYTES ? (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Total uploaded source files exceed 150MB. Browser ZIP/PDF generation can become slow or
            crash with very large files.
          </p>
        ) : null}
        {files.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/80 bg-white/35 p-6 text-sm text-slate-500">
            Upload generated masks to start reviewing. Filename matches are mapped automatically,
            and mismatches can be repaired with the topic dropdown.
          </p>
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
