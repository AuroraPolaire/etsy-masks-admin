import { useRef } from 'react';

import { IconButton } from './IconButton';

import type { LucideIcon } from 'lucide-react';
import type { ChangeEvent } from 'react';

type FileInputButtonProps = {
  icon: LucideIcon;
  label: string;
  accept: string;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export const FileInputButton = ({
  icon,
  label,
  accept,
  disabled = false,
  onFileSelected,
}: FileInputButtonProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <IconButton
        icon={icon}
        label={label}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      />
    </>
  );
};
