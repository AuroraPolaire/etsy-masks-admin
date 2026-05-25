import { useState } from 'react';

import { AIButton } from './ui/AIButton';
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
            <h2 className="text-lg font-bold text-ink-strong">Start from an idea</h2>
            <p className="mt-1 text-sm text-ink-muted">
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
          placeholder="Describe the bundle theme, audience, visual style, mask count, and topics you want included."
          value={initialPrompt}
          onChange={(event) => setInitialPrompt(event.target.value)}
        />
        <p className="text-xs text-ink-muted">
          {hasOpenAIKey
            ? 'Uses the same pasted OpenAI API key as image generation. The key is not saved.'
            : 'Paste an OpenAI API key in AI setup to draft this with AI. Without a key, the app uses a local template.'}
        </p>
        {hasOpenAIKey ? (
          <AIButton disabled={disabled || initialPrompt.trim().length === 0} onClick={applyDraft}>
            {isGenerating ? 'Filling product brief...' : 'Fill product brief with AI'}
          </AIButton>
        ) : (
          <Button
            variant="primary"
            disabled={disabled || initialPrompt.trim().length === 0}
            onClick={applyDraft}
          >
            {isGenerating ? 'Filling product brief...' : 'Fill product brief locally'}
          </Button>
        )}
      </CardBody>
    </Card>
  );
};
