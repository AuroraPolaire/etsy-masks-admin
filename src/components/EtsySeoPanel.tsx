import { useState } from 'react';

import { analyzeEtsySeo } from '../lib/etsySeo';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Surface } from './ui/Surface';
import { Textarea } from './ui/Textarea';

import type { Project, ProjectSettings } from '../types';

type EtsySeoPanelProps = {
  project: Project;
  onChange: (settings: ProjectSettings) => void;
};

export const EtsySeoPanel = ({ project, onChange }: EtsySeoPanelProps) => {
  const [showDescriptionDraft, setShowDescriptionDraft] = useState(false);
  const analysis = analyzeEtsySeo(project);
  const passedCount = analysis.checks.filter((check) => check.passed).length;
  const suggestedTags = analysis.suggestedTags.join(', ');

  const updateSettings = (patch: Partial<ProjectSettings>) => {
    onChange({
      ...project.settings,
      ...patch,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-strong">Etsy SEO assistant</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Keep titles readable, tags useful, and the product clear in the first sentence.
            </p>
          </div>
          <Badge tone={passedCount === analysis.checks.length ? 'success' : 'warning'}>
            {passedCount}/{analysis.checks.length}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Surface variant="muted" className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Suggested title</p>
              <p className="mt-1 text-sm font-semibold text-ink-strong">
                {analysis.suggestedTitle}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {analysis.suggestedTitle.split(/\s+/).length} words, product-first, count included.
              </p>
            </div>
            <Button onClick={() => updateSettings({ title: analysis.suggestedTitle })}>
              Use title
            </Button>
          </div>
        </Surface>

        <Surface variant="muted" className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">Suggested tags</p>
              <p className="mt-1 text-sm text-ink-base">{suggestedTags}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {analysis.suggestedTags.length} tags, each 20 characters or fewer.
              </p>
            </div>
            <Button onClick={() => updateSettings({ tags: suggestedTags })}>Use tags</Button>
          </div>
        </Surface>

        <Surface variant="muted" className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-muted">
                Suggested description
              </p>
              <p className="mt-1 text-sm text-ink-base">
                Structured buyer copy with included files, use cases, instructions, disclaimers, and
                natural keyword phrases.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowDescriptionDraft((isVisible) => !isVisible)}>
                {showDescriptionDraft ? 'Hide draft' : 'Preview draft'}
              </Button>
              <Button
                variant="primary"
                onClick={() => updateSettings({ description: analysis.suggestedDescription })}
              >
                Use description
              </Button>
            </div>
          </div>
          {showDescriptionDraft ? (
            <Textarea
              className="mt-3 min-h-72"
              label="Description draft preview"
              name="etsyDescriptionDraft"
              readOnly
              value={analysis.suggestedDescription}
            />
          ) : null}
        </Surface>

        <ul className="space-y-2">
          {analysis.checks.map((check) => (
            <Surface as="li" key={check.id} variant="muted" className="p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-ink-strong">{check.label}</span>
                <Badge tone={check.passed ? 'success' : 'warning'}>
                  {check.passed ? 'Pass' : 'Review'}
                </Badge>
              </div>
              <p className="mt-1 text-ink-muted">{check.details}</p>
            </Surface>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
};
