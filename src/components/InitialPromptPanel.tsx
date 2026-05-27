import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { StylePromptWizard } from './StylePromptWizard';
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
  const [wizardOpen, setWizardOpen] = useState(false);

  const applyDraft = () => {
    onFillBrief(initialPrompt);
  };

  const updateInitialPrompt = (value: string) => {
    setInitialPrompt(value);
  };

  return (
    <>
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
          <div className="flex flex-col gap-3 rounded-panel border border-surface-outline bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-strong">Style prompt wizard</p>
              <p className="mt-1 text-sm text-ink-muted">
                Build a prompt from visual styles, topics, SEO angle, and printable mask rules.
              </p>
            </div>
            <Button disabled={disabled} variant="primary" onClick={() => setWizardOpen(true)}>
              <Sparkles aria-hidden="true" className="mr-2" size={17} />
              Open wizard
            </Button>
          </div>
          <Textarea
            label="Bundle idea"
            name="initialPrompt"
            rows={7}
            placeholder="Example: 10 woodland animal masks for a kids birthday party, watercolor style, classroom friendly."
            value={initialPrompt}
            onChange={(event) => updateInitialPrompt(event.target.value)}
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
      <StylePromptWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onApply={setInitialPrompt}
      />
    </>
  );
};
