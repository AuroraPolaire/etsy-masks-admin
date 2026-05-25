import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getExpectedFilename } from '../lib/files';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';

import type { SubjectItem } from '../types';

type TopicSetupPanelProps = {
  subjects: SubjectItem[];
  onAddSubject: (name: string) => void;
  onRemoveSubject: (subjectId: string) => void;
};

export const TopicSetupPanel = ({
  subjects,
  onAddSubject,
  onRemoveSubject,
}: TopicSetupPanelProps) => {
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
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            label="Add mask topic"
            name="workflowAddSubject"
            value={subjectName}
            placeholder="Lion, robot, butterfly"
            onChange={(event) => setSubjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSubject();
              }
            }}
          />
        </div>
        <Button variant="primary" onClick={addSubject}>
          Add topic
        </Button>
      </div>
      {subjects.length === 0 ? (
        <EmptyState>Add one topic to unlock image generation.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {subjects.map((subject) => (
            <Surface
              as="article"
              key={subject.id}
              variant="muted"
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-ink-strong">{subject.name}</h3>
                <p className="mt-1 truncate font-mono text-xs text-ink-muted">
                  {getExpectedFilename(subject.name)}
                </p>
              </div>
              <IconButton
                icon={Trash2}
                label={`Remove ${subject.name}`}
                variant="danger"
                onClick={() => onRemoveSubject(subject.id)}
              />
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
};
