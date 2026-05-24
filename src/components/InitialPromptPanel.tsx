import { useState } from 'react';

import { createProjectDraftFromInitialPrompt } from '../lib/brief';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';

import type { SubjectItem, ProjectSettings } from '../types';

type InitialPromptPanelProps = {
  onApplyDraft: (draft: { settings: ProjectSettings; subjects: SubjectItem[] }) => void;
};

const STARTER_IDEAS = [
  'Space party masks for kids with astronaut, rocket, alien, planet, star, moon, and sun.',
  'Ocean adventure masks for kids with shark, whale, dolphin, octopus, turtle, crab, and seahorse.',
  'Fairy tale masks for kids with dragon, unicorn, fairy, wizard, knight, crown, and castle.',
  'Garden craft masks for kids with butterfly, flower, bee, ladybug, frog, sun, and rainbow.',
];

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
            Optional: paste a short bundle idea and fill the brief, tags, and mask topic list.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Initial bundle prompt"
          name="initialPrompt"
          rows={4}
          placeholder="Example: Space party masks for kids with astronaut, rocket, alien, planet, star, moon, and sun."
          value={initialPrompt}
          onChange={(event) => setInitialPrompt(event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {STARTER_IDEAS.map((idea) => (
            <Button key={idea} variant="ghost" onClick={() => setInitialPrompt(idea)}>
              {idea.split(' with ')[0]}
            </Button>
          ))}
        </div>
        <Button variant="primary" onClick={applyDraft}>
          Fill product brief
        </Button>
      </CardBody>
    </Card>
  );
};
