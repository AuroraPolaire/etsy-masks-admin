import { useState } from 'react';

import { getFileForSubject } from '../lib/files';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';

import type { SubjectItem, ManagedFile, PromptItem } from '../types';

type PromptManagerProps = {
  subjects: SubjectItem[];
  prompts: PromptItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingSubjectId: string | null;
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
  onGenerateImage: (subjectId: string) => void;
  onCopy: (label: string) => void;
};

const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export const PromptManager = ({
  subjects,
  prompts,
  files,
  canGenerateImages,
  generatingSubjectId,
  onAddSubject,
  onRemoveSubject,
  onGenerateImage,
  onCopy,
}: PromptManagerProps) => {
  const [subjectName, setSubjectName] = useState('');

  const addSubject = () => {
    const trimmedName = subjectName.trim();
    if (!trimmedName) {
      return;
    }

    onAddSubject(trimmedName);
    setSubjectName('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Mask topics</h2>
            <p className="mt-1 text-sm text-slate-600">
              Generate masks with the OpenAI Images API, or copy prompts for manual use.
            </p>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              label="Add topic"
              name="addSubject"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSubject();
                }
              }}
            />
            <Button className="self-end" variant="primary" onClick={addSubject}>
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {prompts.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Add at least one topic to generate image prompts.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {prompts.map((prompt) => {
              const matchingFile = files.find(
                (file) => file.originalName.toLowerCase() === prompt.expectedFilename.toLowerCase(),
              );
              const mappedFile = getFileForSubject(files, prompt.subjectId, 'approved');
              const subject = subjects.find((item) => item.id === prompt.subjectId);

              return (
                <article
                  key={prompt.subjectId}
                  className="rounded-lg border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">{prompt.subjectName}</h3>
                      <p className="mt-1 font-mono text-sm text-slate-700">
                        {prompt.expectedFilename}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={matchingFile ? 'success' : 'neutral'}>
                        {matchingFile ? 'Matching file uploaded' : 'No filename match'}
                      </Badge>
                      <Badge tone={mappedFile ? 'success' : 'warning'}>
                        {mappedFile ? 'Approved image mapped' : 'No approved mapping'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Prompt</p>
                      <p className="mt-1 rounded-md border border-white/70 bg-white/65 p-3 text-sm text-slate-700">
                        {prompt.prompt}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Negative requirements
                      </p>
                      <p className="mt-1 rounded-md border border-white/70 bg-white/65 p-3 text-sm text-slate-700">
                        {prompt.negativeRequirements}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      disabled={!canGenerateImages || generatingSubjectId !== null}
                      onClick={() => onGenerateImage(prompt.subjectId)}
                    >
                      {generatingSubjectId === prompt.subjectId
                        ? 'Generating...'
                        : 'Generate image'}
                    </Button>
                    <Button
                      onClick={() => {
                        void copyText(prompt.prompt)
                          .then(() => onCopy(`Copied prompt for ${prompt.subjectName}`))
                          .catch(() => onCopy(`Could not copy prompt for ${prompt.subjectName}`));
                      }}
                    >
                      Copy prompt
                    </Button>
                    <Button
                      onClick={() => {
                        void copyText(prompt.expectedFilename)
                          .then(() => onCopy(`Copied filename for ${prompt.subjectName}`))
                          .catch(() => onCopy(`Could not copy filename for ${prompt.subjectName}`));
                      }}
                    >
                      Copy filename
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (subject) {
                          onRemoveSubject(subject.id);
                        }
                      }}
                    >
                      Remove topic
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
