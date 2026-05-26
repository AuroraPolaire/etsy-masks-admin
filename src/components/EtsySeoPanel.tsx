import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { analyzeEtsySeo } from '../lib/etsySeo';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { Surface } from './ui/Surface';
import { Textarea } from './ui/Textarea';

import type { Project, ProjectSettings } from '../types';

type EtsySeoPanelProps = {
  project: Project;
  onChange: (settings: ProjectSettings) => void;
};

export const EtsySeoPanel = ({ project, onChange }: EtsySeoPanelProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showDescriptionDraft, setShowDescriptionDraft] = useState(false);
  const detailsId = useId();
  const localAnalysis = analyzeEtsySeo(project);
  const analysis = project.etsySeoAnalysis ?? localAnalysis;
  const analysisSource = project.etsySeoAnalysis ? 'AI SEO' : 'Local SEO';
  const passedCount = analysis.checks.filter((check) => check.passed).length;
  const suggestedTags = analysis.suggestedTags.join(', ');
  const titleWordCount = analysis.titleWordCount;
  const tagCount = analysis.tags.length;
  const repeatedWordCount = analysis.repeatedTitleWords.length;

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
            <h2 className="text-lg font-bold text-ink-strong">Etsy SEO</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Check title, tags, and description for buyer-ready Etsy copy.
            </p>
          </div>
          <div className="self-start">
            <div className="flex flex-wrap gap-2">
              <Badge tone={project.etsySeoAnalysis ? 'info' : 'neutral'}>{analysisSource}</Badge>
              <Badge tone={passedCount === analysis.checks.length ? 'success' : 'warning'}>
                {passedCount}/{analysis.checks.length}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-ink-muted">
          {project.etsySeoAnalysis
            ? `AI SEO was generated when the brief was drafted${
                project.lastEtsySeoGeneratedAt
                  ? ` on ${new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(project.lastEtsySeoGeneratedAt))}`
                  : ''
              }.`
            : 'Draft the brief with AI to generate listing-specific SEO suggestions.'}
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
          <StatCard label="Checks passed" value={`${passedCount}/${analysis.checks.length}`} />
          <StatCard label="Title words" value={titleWordCount} />
          <StatCard label="Tag count" value={tagCount} />
          <StatCard label="Repeated title words" value={repeatedWordCount} />
        </dl>
        <Button
          className="w-full gap-2"
          variant="ghost"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((isOpen) => !isOpen)}
        >
          {detailsOpen ? 'Hide SEO suggestions' : 'Show SEO suggestions'}
          <ChevronDown
            aria-hidden="true"
            className={`transition ${detailsOpen ? 'rotate-180' : ''}`}
            size={16}
          />
        </Button>

        {detailsOpen ? (
          <div id={detailsId} className="space-y-4">
            <Surface variant="muted" className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink-muted">Suggested title</p>
                  <p className="mt-1 text-sm font-semibold text-ink-strong">
                    {analysis.suggestedTitle}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {analysis.suggestedTitle.split(/\s+/).length} words, product first, count
                    included.
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
                    Buyer-ready copy with contents, use cases, instructions, disclaimers, and
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
                      {check.passed ? 'Pass' : 'Fix'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-ink-muted">{check.details}</p>
                </Surface>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};
