import { useState } from 'react';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';

type InitialPromptPanelProps = {
  hasOpenAIKey: boolean;
  disabled: boolean;
  isGenerating: boolean;
  onFillBrief: (initialPrompt: string) => void;
};

const STARTER_IDEAS = [
  'Space party masks for kids with astronaut, rocket, alien, planet, star, moon, and sun.',
  'Ocean adventure masks for kids with shark, whale, dolphin, octopus, turtle, crab, and seahorse.',
  'Fairy tale masks for kids with dragon, unicorn, fairy, wizard, knight, crown, and castle.',
  'Garden craft masks for kids with butterfly, flower, bee, ladybug, frog, sun, and rainbow.',
];

export const InitialPromptPanel = ({
  hasOpenAIKey,
  disabled,
  isGenerating,
  onFillBrief,
}: InitialPromptPanelProps) => {
  const [initialPrompt, setInitialPrompt] = useState('');

  const applyDraft = () => {
    onFillBrief(initialPrompt);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Start from an idea</h2>
            <p className="mt-1 text-sm text-slate-600">
              Paste a short bundle idea and draft the brief, tags, description, and topic list.
            </p>
          </div>
          <Badge tone={hasOpenAIKey ? 'success' : 'neutral'}>
            {hasOpenAIKey ? 'AI brief ready' : 'Local fallback'}
          </Badge>
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
        <p className="text-xs text-slate-500">
          {hasOpenAIKey
            ? 'Uses the same pasted OpenAI API key as image generation. The key is not saved.'
            : 'Paste an OpenAI API key above to draft this with AI. Without a key, the app uses a local template.'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STARTER_IDEAS.map((idea) => (
            <Button key={idea} variant="ghost" onClick={() => setInitialPrompt(idea)}>
              {idea.split(' with ')[0]}
            </Button>
          ))}
        </div>
        <Button
          variant="primary"
          disabled={disabled || initialPrompt.trim().length === 0}
          onClick={applyDraft}
        >
          {isGenerating
            ? 'Filling product brief...'
            : hasOpenAIKey
              ? 'Fill product brief with AI'
              : 'Fill product brief locally'}
        </Button>
      </CardBody>
    </Card>
  );
};
