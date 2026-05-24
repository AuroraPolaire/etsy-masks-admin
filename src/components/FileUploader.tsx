import { useRef, useState } from 'react';
import { ACCEPTED_FILE_EXTENSIONS } from '../constants';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';

type FileUploaderProps = {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
};

export const FileUploader = ({ onFilesSelected, disabled }: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) {
      return;
    }

    onFilesSelected(Array.from(fileList));
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold text-slate-950">Upload files</h2>
      </CardHeader>
      <CardBody>
        <label
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
            isDragging ? 'border-teal-700 bg-teal-50' : 'border-slate-300 bg-slate-50'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <span className="text-base font-bold text-slate-950">Drop files here or browse</span>
          <span className="mt-2 max-w-xl text-sm text-slate-600">
            Accepts PNG, JPG, JPEG, WEBP, PDF, ZIP, TXT, and JSON. Uploaded binary files are not
            saved after refresh.
          </span>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            multiple
            accept={ACCEPTED_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
            disabled={disabled}
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button className="mt-5" variant="primary" disabled={disabled}>
            Choose files
          </Button>
        </label>
      </CardBody>
    </Card>
  );
};
