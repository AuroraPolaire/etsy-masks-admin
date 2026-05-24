import { MAX_ETSY_FILE_BYTES } from '../constants';
import { formatBytes, getExpectedFilename, isImageFile } from '../lib/files';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';

import type { AnimalItem, ManagedFile } from '../types';

type FilePreviewCardProps = {
  file: ManagedFile;
  animals: AnimalItem[];
  onApprove: (fileId: string) => void;
  onReject: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  onMap: (fileId: string, animalId: string | undefined) => void;
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
  animals,
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
  const mappedAnimal = animals.find((animal) => animal.id === file.mappedAnimalId);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex aspect-square items-center justify-center bg-slate-100">
        {image && file.objectUrl ? (
          <img
            className="size-full object-contain p-3"
            src={file.objectUrl}
            alt={`Preview of ${file.name}`}
          />
        ) : (
          <div className="text-center text-sm text-slate-600">
            <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-md bg-white text-2xl shadow-sm">
              {file.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
            </div>
            Non-image file
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="break-words text-sm font-bold text-slate-950">{file.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={reviewTone[file.reviewState]}>{file.reviewState}</Badge>
            <Badge tone="neutral">{formatBytes(file.size)}</Badge>
            {file.kind !== 'uploaded' ? <Badge tone="info">{file.kind}</Badge> : null}
          </div>
        </div>
        {file.imageMetadata ? (
          <p className="text-sm text-slate-600">
            Dimensions: {file.imageMetadata.width} x {file.imageMetadata.height}px
          </p>
        ) : null}
        {isLowResolution ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            Below 2000x2000. Prefer 3000x3000 or higher for good print quality.
          </p>
        ) : null}
        {isRecommendedResolution ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
            Meets the 3000x3000 recommended print-quality target.
          </p>
        ) : null}
        {isLarge ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            Over 20MB. Etsy upload files may need manual splitting or smaller source images.
          </p>
        ) : null}
        {file.kind === 'uploaded' && image ? (
          <>
            <Select
              label="Map to animal"
              name={`map-${file.id}`}
              value={file.mappedAnimalId ?? ''}
              options={[
                { value: '', label: 'Unmapped / unused' },
                ...animals.map((animal) => ({
                  value: animal.id,
                  label: `${animal.name} (${getExpectedFilename(animal.name)})`,
                })),
              ]}
              onChange={(event) => onMap(file.id, event.target.value || undefined)}
            />
            {mappedAnimal ? (
              <p className="text-xs text-slate-500">
                Export rename: {getExpectedFilename(mappedAnimal.name)}
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
              <Button onClick={() => onConfirmReview(file.id)}>Confirm review</Button>
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
    </article>
  );
};
