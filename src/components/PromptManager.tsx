import { useState } from 'react';
import type { AnimalItem, ManagedFile, PromptItem } from '../types';
import { getFileForAnimal } from '../lib/files';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Input } from './ui/Input';

type PromptManagerProps = {
  animals: AnimalItem[];
  prompts: PromptItem[];
  files: ManagedFile[];
  canGenerateImages: boolean;
  generatingAnimalId: string | null;
  onAddAnimal: (name: string) => void;
  onRemoveAnimal: (animalId: string) => void;
  onGenerateImage: (animalId: string) => void;
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
  animals,
  prompts,
  files,
  canGenerateImages,
  generatingAnimalId,
  onAddAnimal,
  onRemoveAnimal,
  onGenerateImage,
  onCopy,
}: PromptManagerProps) => {
  const [animalName, setAnimalName] = useState('');

  const addAnimal = () => {
    const trimmedName = animalName.trim();
    if (!trimmedName) {
      return;
    }

    onAddAnimal(trimmedName);
    setAnimalName('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Animal prompts</h2>
            <p className="mt-1 text-sm text-slate-600">
              Generate masks with the OpenAI Images API, or copy prompts for manual use.
            </p>
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <Input
              label="Add animal"
              name="addAnimal"
              value={animalName}
              onChange={(event) => setAnimalName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addAnimal();
                }
              }}
            />
            <Button className="self-end" variant="primary" onClick={addAnimal}>
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {prompts.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Add at least one animal to generate image prompts.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {prompts.map((prompt) => {
              const matchingFile = files.find(
                (file) => file.originalName.toLowerCase() === prompt.expectedFilename.toLowerCase(),
              );
              const mappedFile = getFileForAnimal(files, prompt.animalId, 'approved');
              const animal = animals.find((item) => item.id === prompt.animalId);

              return (
                <article
                  key={prompt.animalId}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">{prompt.animalName}</h3>
                      <p className="mt-1 font-mono text-sm text-slate-700">{prompt.expectedFilename}</p>
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
                      <p className="mt-1 rounded-md bg-white p-3 text-sm text-slate-700">{prompt.prompt}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Negative requirements
                      </p>
                      <p className="mt-1 rounded-md bg-white p-3 text-sm text-slate-700">
                        {prompt.negativeRequirements}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      disabled={!canGenerateImages || generatingAnimalId !== null}
                      onClick={() => onGenerateImage(prompt.animalId)}
                    >
                      {generatingAnimalId === prompt.animalId ? 'Generating...' : 'Generate image'}
                    </Button>
                    <Button
                      onClick={() => {
                        void copyText(prompt.prompt)
                          .then(() => onCopy(`Copied prompt for ${prompt.animalName}`))
                          .catch(() => onCopy(`Could not copy prompt for ${prompt.animalName}`));
                      }}
                    >
                      Copy prompt
                    </Button>
                    <Button
                      onClick={() => {
                        void copyText(prompt.expectedFilename)
                          .then(() => onCopy(`Copied filename for ${prompt.animalName}`))
                          .catch(() => onCopy(`Could not copy filename for ${prompt.animalName}`));
                      }}
                    >
                      Copy filename
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (animal) {
                          onRemoveAnimal(animal.id);
                        }
                      }}
                    >
                      Remove animal
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
