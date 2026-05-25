import { useState } from 'react';

import { AIButton } from './ui/AIButton';
import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';

type InitialPromptPanelProps = {
  aiReady: boolean;
  disabled: boolean;
  isGenerating: boolean;
  onFillBrief: (initialPrompt: string) => void;
};

export const InitialPromptPanel = ({
  aiReady,
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
          <Badge tone={aiReady ? 'success' : 'warning'}>
            {aiReady ? 'Backend AI ready' : 'Backend required'}
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
          Brief drafting is handled by the backend OpenAI proxy. Configure Cloudflare Access and the
          Worker OpenAI secret before using AI actions.
        </p>
        <AIButton
          disabled={disabled || !aiReady || initialPrompt.trim().length === 0}
          onClick={applyDraft}
        >
          {isGenerating ? 'Drafting brief...' : 'Draft brief with backend AI'}
        </AIButton>
      </CardBody>
    </Card>
  );
};
