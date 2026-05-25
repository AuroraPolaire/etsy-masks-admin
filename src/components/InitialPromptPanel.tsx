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
            <h2 className="text-lg font-bold text-ink-strong">Draft from an idea</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Describe the bundle once. The app drafts listing copy and a topic list.
            </p>
          </div>
          <Badge tone={hasOpenAIKey ? 'success' : 'neutral'}>
            {hasOpenAIKey ? 'AI ready' : 'Local draft'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Bundle idea"
          name="initialPrompt"
          rows={4}
          placeholder="Example: 10 woodland animal masks for a kids birthday party, watercolor style, classroom friendly."
          value={initialPrompt}
          onChange={(event) => setInitialPrompt(event.target.value)}
        />
        <p className="text-xs text-ink-muted">
          {hasOpenAIKey
            ? 'Uses the session OpenAI key from AI setup. The key is not saved.'
            : 'Add an OpenAI key in AI setup for an AI draft, or use the local template.'}
        </p>
        {hasOpenAIKey ? (
          <AIButton disabled={disabled || initialPrompt.trim().length === 0} onClick={applyDraft}>
            {isGenerating ? 'Drafting brief...' : 'Draft brief with AI'}
          </AIButton>
        ) : (
          <Button
            variant="primary"
            disabled={disabled || initialPrompt.trim().length === 0}
            onClick={applyDraft}
          >
            {isGenerating ? 'Drafting brief...' : 'Draft brief locally'}
          </Button>
        )}
      </CardBody>
    </Card>
  );
};
