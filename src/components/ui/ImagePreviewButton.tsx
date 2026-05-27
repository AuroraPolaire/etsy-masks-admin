import { ZoomIn } from 'lucide-react';
import { PhotoView } from 'react-photo-view';

type ImagePreviewButtonProps = {
  src: string;
  alt: string;
  label: string;
  frameClassName?: string;
  imageClassName?: string;
};

export const ImagePreviewButton = ({
  src,
  alt,
  label,
  frameClassName = '',
  imageClassName = '',
}: ImagePreviewButtonProps) => (
  <div className="space-y-2">
    <div
      className={`flex aspect-square w-full items-center justify-center rounded-control bg-surface-muted ${frameClassName}`}
    >
      <img className={`size-full object-contain ${imageClassName}`} src={src} alt={alt} />
    </div>
    <PhotoView src={src}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex min-h-9 w-full items-center justify-center rounded-control border border-surface-outline bg-surface-raised px-3 py-2 text-sm font-semibold text-ink-strong shadow-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <ZoomIn aria-hidden="true" className="mr-2" size={16} />
        Open full-size
      </button>
    </PhotoView>
  </div>
);
