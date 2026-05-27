import { useState } from 'react';

import { initialPromptStyleTemplates } from '../lib/styleTemplates';
import { AIButton } from './ui/AIButton';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Select } from './ui/Select';
import { Surface } from './ui/Surface';
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
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const selectedTemplate = initialPromptStyleTemplates.find(
    (template) => template.id === selectedTemplateId,
  );

  const applyDraft = () => {
    onFillBrief(initialPrompt);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = initialPromptStyleTemplates.find((item) => item.id === templateId);
    if (template) {
      setInitialPrompt(template.prompt);
    }
  };

  const updateInitialPrompt = (value: string) => {
    setInitialPrompt(value);
    if (selectedTemplate && value !== selectedTemplate.prompt) {
      setSelectedTemplateId('');
    }
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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
          <Select
            label="Style template"
            name="styleTemplate"
            value={selectedTemplateId}
            disabled={disabled}
            options={[
              { value: '', label: `Choose from ${initialPromptStyleTemplates.length} styles` },
              ...initialPromptStyleTemplates.map((template) => ({
                value: template.id,
                label: template.name,
              })),
            ]}
            onChange={(event) => handleTemplateChange(event.target.value)}
          />
          <Surface variant="default" className="min-h-20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-strong">
                {selectedTemplate?.name ?? 'Custom idea'}
              </p>
              <Badge tone={selectedTemplate ? 'success' : 'neutral'}>
                {selectedTemplate ? 'Template' : 'Manual'}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-5 text-ink-muted">
              {selectedTemplate?.description ??
                'Write the bundle idea directly, or choose a style template.'}
            </p>
          </Surface>
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
  );
};
