import { useState } from 'react';

import { analyzeEtsySeo } from '../lib/etsySeo';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
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
            <h2 className="text-lg font-bold text-slate-950">Etsy SEO assistant</h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep titles readable, tags useful, and the product clear in the first sentence.
            </p>
          </div>
          <Badge tone={passedCount === analysis.checks.length ? 'success' : 'warning'}>
            {passedCount}/{analysis.checks.length}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="rounded-lg border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Suggested title</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{analysis.suggestedTitle}</p>
              <p className="mt-1 text-xs text-slate-500">
                {analysis.suggestedTitle.split(/\s+/).length} words, product-first, count included.
              </p>
            </div>
            <Button onClick={() => updateSettings({ title: analysis.suggestedTitle })}>
              Use title
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Suggested tags</p>
              <p className="mt-1 text-sm text-slate-700">{suggestedTags}</p>
              <p className="mt-1 text-xs text-slate-500">
                {analysis.suggestedTags.length} tags, each 20 characters or fewer.
              </p>
            </div>
            <Button onClick={() => updateSettings({ tags: suggestedTags })}>Use tags</Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/70 bg-white/50 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Suggested description
              </p>
              <p className="mt-1 text-sm text-slate-700">
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
        </div>

        <ul className="space-y-2">
          {analysis.checks.map((check) => (
            <li
              key={check.id}
              className="rounded-md border border-white/70 bg-white/45 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-slate-900">{check.label}</span>
                <Badge tone={check.passed ? 'success' : 'warning'}>
                  {check.passed ? 'Pass' : 'Review'}
                </Badge>
              </div>
              <p className="mt-1 text-slate-600">{check.details}</p>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
};
