import { MAX_ETSY_FILE_BYTES } from '../constants';
import { formatBytes, getExpectedFilename, isImageFile } from '../lib/files';
import { Alert } from './ui/Alert';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';
import { Textarea } from './ui/Textarea';

import type { SubjectItem, ManagedFile } from '../types';

type FilePreviewCardProps = {
  file: ManagedFile;
  subjects: SubjectItem[];
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onMap: (fileId: string, subjectId: string | undefined) => void;
  onNotesChange: (fileId: string, notes: string) => void;
  onConfirmReview: (fileId: string) => void;
};

const reviewTone = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
} as const;

export const FilePreviewCard = ({
  file,
  subjects,
  onApprove,
  onReject,
  onDelete,
  onMap,
  onNotesChange,
  onConfirmReview,
}: FilePreviewCardProps) => {
  const image = isImageFile(file);
  const isLowResolution =
    image &&
    file.imageMetadata &&
    (file.imageMetadata.width < 2000 || file.imageMetadata.height < 2000);
  const isRecommendedResolution =
    image &&
    file.imageMetadata &&
    file.imageMetadata.width >= 3000 &&
    file.imageMetadata.height >= 3000;
  const isLarge = file.size > MAX_ETSY_FILE_BYTES;
  const mappedSubject = subjects.find((subject) => subject.id === file.mappedSubjectId);

  return (
    <Surface as="article" variant="raised" className="flex flex-col overflow-hidden">
      <div className="flex aspect-square items-center justify-center bg-surface-muted">
        {image && file.objectUrl ? (
          <img
            className="size-full object-contain p-3"
            src={file.objectUrl}
            alt={`Preview of ${file.name}`}
          />
        ) : (
          <div className="text-center text-sm text-ink-muted">
            <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-control bg-surface-raised text-2xl shadow-sm">
              {file.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
            </div>
            Not an image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="break-words text-sm font-bold text-ink-strong">{file.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={reviewTone[file.reviewState]}>{file.reviewState}</Badge>
            <Badge tone="neutral">{formatBytes(file.size)}</Badge>
            {file.kind !== 'uploaded' ? <Badge tone="info">{file.kind}</Badge> : null}
          </div>
        </div>
        {file.imageMetadata ? (
          <p className="text-sm text-ink-muted">
            Size: {file.imageMetadata.width} x {file.imageMetadata.height}px
          </p>
        ) : null}
        {isLowResolution ? (
          <Alert tone="warning" density="compact">
            Below 2000x2000. Use 3000x3000 or higher for sharper prints.
          </Alert>
        ) : null}
        {isRecommendedResolution ? (
          <Alert tone="success" density="compact">
            Meets the 3000x3000 print-quality target.
          </Alert>
        ) : null}
        {isLarge ? (
          <Alert tone="warning" density="compact">
            Over 20MB. Etsy upload may need smaller files or manual splitting.
          </Alert>
        ) : null}
        {file.kind === 'uploaded' && image ? (
          <>
            <Select
              label="Map to topic"
              name={`map-${file.id}`}
              value={file.mappedSubjectId ?? ''}
              options={[
                { value: '', label: 'Not assigned / unused' },
                ...subjects.map((subject) => ({
                  value: subject.id,
                  label: `${subject.name} (${getExpectedFilename(subject.name)})`,
                })),
              ]}
              onChange={(event) => onMap(file.id, event.target.value || undefined)}
            />
            {mappedSubject ? (
              <p className="text-xs text-ink-muted">
                Export filename: {getExpectedFilename(mappedSubject.name)}
              </p>
            ) : null}
            <Textarea
              label="Review notes"
              name={`notes-${file.id}`}
              rows={3}
              value={file.reviewNotes}
              onChange={(event) => onNotesChange(file.id, event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => onApprove(file.id)}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => onReject(file.id)}>
                Reject
              </Button>
              <Button onClick={() => onConfirmReview(file.id)}>Mark reviewed</Button>
              <Button variant="ghost" onClick={() => onDelete(file.id)}>
                Delete
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => onDelete(file.id)}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </Surface>
  );
};
