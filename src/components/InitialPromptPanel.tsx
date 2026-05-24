import { useState } from 'react';
import type { AnimalItem, ProjectSettings } from '../types';
import { createProjectDraftFromInitialPrompt } from '../lib/brief';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';

type InitialPromptPanelProps = {
  onApplyDraft: (draft: { settings: ProjectSettings; animals: AnimalItem[] }) => void;
};

export const InitialPromptPanel = ({ onApplyDraft }: InitialPromptPanelProps) => {
  const [initialPrompt, setInitialPrompt] = useState('');

  const applyDraft = () => {
    const draft = createProjectDraftFromInitialPrompt(initialPrompt);
    onApplyDraft(draft);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Start from an idea</h2>
          <p className="mt-1 text-sm text-slate-600">
            Optional: paste a short bundle idea and fill the brief, tags, and animal list.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Initial bundle prompt"
          name="initialPrompt"
          rows={4}
          placeholder="Example: Cute woodland animal masks for a preschool birthday party with fox, owl, bear, deer, rabbit, and wolf."
          value={initialPrompt}
          onChange={(event) => setInitialPrompt(event.target.value)}
        />
        <Button variant="primary" onClick={applyDraft}>
          Fill product brief
        </Button>
      </CardBody>
    </Card>
  );
};
