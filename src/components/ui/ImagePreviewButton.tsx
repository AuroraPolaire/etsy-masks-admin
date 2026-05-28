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
      className={`flex aspect-square w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-control border-0 bg-surface-muted p-0 transition focus:outline-none focus:ring-2 focus:ring-brand/30 ${frameClassName}`}
    >
      <img className={`size-full object-contain ${imageClassName}`} src={src} alt={alt} />
    </button>
  </PhotoView>
);
