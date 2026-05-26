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
  <PhotoView src={src}>
    <button
      type="button"
      aria-label={label}
      className={`group flex aspect-square w-full items-center justify-center rounded-control bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30 ${frameClassName}`}
    >
      <img
        className={`size-full object-contain p-3 transition group-hover:scale-[1.01] ${imageClassName}`}
        src={src}
        alt={alt}
      />
    </button>
  </PhotoView>
);
