import { useState } from 'react';

import { initialPromptStyleTemplates } from '../lib/styleTemplates';
import { AIButton } from './ui/AIButton';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Textarea } from './ui/Textarea';

type InitialPromptPanelProps = {
  aiReady: boolean;
  disabled: boolean;
  isGenerating: boolean;
  onFillBrief: (initialPrompt: string) => void;
  onOpenBackendSaves: () => void;
};

export const InitialPromptPanel = ({
  aiReady,
  disabled,
  isGenerating,
  onFillBrief,
  onOpenBackendSaves,
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
            {aiReady ? 'Cloud AI ready' : 'Cloud required'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-strong">Style templates</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {initialPromptStyleTemplates.map((template) => {
              const isSelected = initialPrompt === template.prompt;

              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={isSelected}
                  className={`rounded-control border p-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:ring-offset-2 focus:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-55 ${
                    isSelected
                      ? 'border-brand-border bg-brand-subtle text-brand-strong'
                      : 'border-surface-outline bg-surface-raised text-ink-base hover:bg-surface-muted'
                  }`}
                  disabled={disabled}
                  onClick={() => setInitialPrompt(template.prompt)}
                >
                  <span className="block font-semibold text-ink-strong">{template.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Textarea
          label="Bundle idea"
          name="initialPrompt"
          rows={7}
          placeholder="Example: 10 woodland animal masks for a kids birthday party, watercolor style, classroom friendly."
          value={initialPrompt}
          onChange={(event) => setInitialPrompt(event.target.value)}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!aiReady ? <Button onClick={onOpenBackendSaves}>Open Cloud</Button> : <span />}
          <AIButton
            disabled={disabled || !aiReady || initialPrompt.trim().length === 0}
            onClick={applyDraft}
          >
            {isGenerating ? 'Drafting brief...' : 'Draft brief'}
          </AIButton>
        </div>
      </CardBody>
    </Card>
  );
};
