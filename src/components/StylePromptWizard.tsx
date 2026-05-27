import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  createStylePromptFromWizardValues,
  createStylePromptWizardValues,
} from '../lib/stylePromptWizard';
import { initialPromptStyleTemplates } from '../lib/styleTemplates';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

import type { StylePromptWizardValues } from '../lib/stylePromptWizard';
import type { InitialPromptStyleTemplate } from '../lib/styleTemplates';

type StylePromptWizardProps = {
  open: boolean;
  onClose: () => void;
  onApply: (prompt: string) => void;
};

type WizardStep = 'style' | 'helpers' | 'review';

const helperFields = [
  'bundleIdea',
  'topics',
  'targetMaskCount',
  'audienceUseCase',
  'seoMarketplaceAngle',
  'safetyPrintingEmphasis',
  'extraNotes',
] as const;

const steps: Array<{ id: WizardStep; label: string }> = [
  { id: 'style', label: 'Style' },
  { id: 'helpers', label: 'Helpers' },
  { id: 'review', label: 'Review' },
];

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getInitialTemplate = (): InitialPromptStyleTemplate => {
  const template = initialPromptStyleTemplates[0];
  if (!template) {
    throw new Error('Expected at least one style prompt template.');
  }

  return template;
};

const getFocusableElements = (element: HTMLElement | null): HTMLElement[] => {
  if (!element) {
    return [];
  }

  return Array.from(element.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (focusableElement) => !focusableElement.hasAttribute('aria-hidden'),
  );
};

const getTemplateById = (templateId: string): InitialPromptStyleTemplate =>
  initialPromptStyleTemplates.find((template) => template.id === templateId) ??
  getInitialTemplate();

const preserveHelperValues = (
  nextValues: StylePromptWizardValues,
  currentValues: StylePromptWizardValues,
): StylePromptWizardValues => {
  const preservedValues = { ...nextValues };

  for (const field of helperFields) {
    preservedValues[field] = currentValues[field];
  }

  return preservedValues;
};

export const StylePromptWizard = ({ open, onClose, onApply }: StylePromptWizardProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const firstTemplate = getInitialTemplate();
  const [step, setStep] = useState<WizardStep>('style');
  const [selectedTemplateId, setSelectedTemplateId] = useState(firstTemplate.id);
  const [values, setValues] = useState(() => createStylePromptWizardValues(firstTemplate));
  const [finalPrompt, setFinalPrompt] = useState('');
  const selectedTemplate = useMemo(() => getTemplateById(selectedTemplateId), [selectedTemplateId]);
  const composedPrompt = useMemo(
    () => createStylePromptFromWizardValues(selectedTemplate, values),
    [selectedTemplate, values],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      const focusableElements = getFocusableElements(dialogRef.current);
      const initialFocusElement =
        dialogRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ??
        focusableElements[0] ??
        dialogRef.current;
      initialFocusElement?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const selectTemplate = (template: InitialPromptStyleTemplate) => {
    setSelectedTemplateId(template.id);
    setValues((currentValues) =>
      preserveHelperValues(createStylePromptWizardValues(template), currentValues),
    );
    setFinalPrompt('');
  };

  const updateValue =
    (field: keyof StylePromptWizardValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));
      setFinalPrompt('');
    };

  const reviewPrompt = () => {
    setFinalPrompt(composedPrompt);
    setStep('review');
  };

  const applyPrompt = () => {
    const prompt = finalPrompt.trim().length > 0 ? finalPrompt : composedPrompt;
    onApply(prompt);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/35 px-4 py-6">
      <section
        ref={dialogRef}
        className="flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-panel border border-surface-outline bg-surface-panel shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="border-b border-surface-divider px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-lg font-bold text-ink-strong">
                  Style prompt wizard
                </h2>
                <Badge tone="info">{initialPromptStyleTemplates.length} styles</Badge>
              </div>
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                Build a guided prompt for printable kids paper mask bundles.
              </p>
            </div>
            <IconButton
              icon={X}
              label="Close style prompt wizard"
              variant="ghost"
              onClick={onClose}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((item, index) => (
              <div
                key={item.id}
                className={`inline-flex items-center gap-2 rounded-badge border px-3 py-1 text-xs font-semibold ${
                  item.id === step
                    ? 'border-brand bg-brand-subtle text-brand-strong'
                    : 'border-surface-outline bg-surface-muted text-ink-muted'
                }`}
              >
                <span>{index + 1}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === 'style' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {initialPromptStyleTemplates.map((template) => {
                const selected = template.id === selectedTemplateId;

                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`flex min-w-0 flex-col overflow-hidden rounded-panel border bg-surface-raised text-left shadow-sm transition hover:border-brand/70 focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                      selected ? 'border-brand ring-2 ring-brand/15' : 'border-surface-outline'
                    }`}
                    aria-pressed={selected}
                    data-autofocus={selected ? 'true' : undefined}
                    onClick={() => selectTemplate(template)}
                  >
                    <img
                      src={template.exampleImageSrc}
                      alt={`${template.name} fox mask example`}
                      width={256}
                      height={256}
                      loading="lazy"
                      className="aspect-square w-full bg-surface-muted object-cover"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink-strong">
                          {template.name}
                        </span>
                        {selected ? <Check aria-hidden="true" size={16} /> : null}
                      </span>
                      <span className="text-xs leading-5 text-ink-muted">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {step === 'helpers' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Input
                  label="Bundle idea/theme"
                  name="bundleIdea"
                  value={values.bundleIdea}
                  placeholder="Woodland animal masks for a preschool birthday party"
                  onChange={updateValue('bundleIdea')}
                />
                <Textarea
                  label="Topics"
                  name="topics"
                  rows={4}
                  value={values.topics}
                  placeholder="Fox, owl, bear, deer, rabbit, wolf"
                  onChange={updateValue('topics')}
                />
                <Input
                  label="Target mask count"
                  name="targetMaskCount"
                  type="number"
                  min={1}
                  max={24}
                  value={values.targetMaskCount}
                  onChange={updateValue('targetMaskCount')}
                />
                <Textarea
                  label="Audience/use case"
                  name="audienceUseCase"
                  rows={3}
                  value={values.audienceUseCase}
                  onChange={updateValue('audienceUseCase')}
                />
                <Textarea
                  label="SEO/marketplace angle"
                  name="seoMarketplaceAngle"
                  rows={3}
                  value={values.seoMarketplaceAngle}
                  onChange={updateValue('seoMarketplaceAngle')}
                />
                <Textarea
                  label="Safety and printing emphasis"
                  name="safetyPrintingEmphasis"
                  rows={3}
                  value={values.safetyPrintingEmphasis}
                  onChange={updateValue('safetyPrintingEmphasis')}
                />
                <Textarea
                  label="Extra notes"
                  name="extraNotes"
                  rows={3}
                  value={values.extraNotes}
                  placeholder="Seasonal angle, preferred topics, or exclusions"
                  onChange={updateValue('extraNotes')}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-panel border border-surface-outline bg-surface-muted p-3">
                  <img
                    src={selectedTemplate.exampleImageSrc}
                    alt={`${selectedTemplate.name} fox mask example`}
                    width={64}
                    height={64}
                    className="size-16 rounded-control border border-surface-outline bg-surface-panel object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-strong">{selectedTemplate.name}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>
                <Textarea
                  label="Mask style"
                  name="maskStyle"
                  rows={5}
                  value={values.maskStyle}
                  onChange={updateValue('maskStyle')}
                />
                <Textarea
                  label="Color painting"
                  name="colorPainting"
                  rows={5}
                  value={values.colorPainting}
                  onChange={updateValue('colorPainting')}
                />
                <Textarea
                  label="Coloring page lines"
                  name="coloringPageLines"
                  rows={5}
                  value={values.coloringPageLines}
                  onChange={updateValue('coloringPageLines')}
                />
              </div>
            </div>
          ) : null}

          {step === 'review' ? (
            <Textarea
              label="Final prompt"
              name="finalPrompt"
              rows={18}
              value={finalPrompt}
              className="font-mono text-xs leading-5"
              onChange={(event) => setFinalPrompt(event.target.value)}
            />
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-surface-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {step !== 'style' ? (
              <Button
                onClick={() => {
                  setStep(step === 'review' ? 'helpers' : 'style');
                }}
              >
                <ArrowLeft aria-hidden="true" className="mr-2" size={17} />
                Back
              </Button>
            ) : null}
            {step === 'style' ? (
              <Button variant="primary" onClick={() => setStep('helpers')}>
                Next
                <ArrowRight aria-hidden="true" className="ml-2" size={17} />
              </Button>
            ) : null}
            {step === 'helpers' ? (
              <Button variant="primary" onClick={reviewPrompt}>
                Review prompt
                <Sparkles aria-hidden="true" className="ml-2" size={17} />
              </Button>
            ) : null}
            {step === 'review' ? (
              <Button variant="primary" onClick={applyPrompt}>
                <Check aria-hidden="true" className="mr-2" size={17} />
                Apply prompt
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};
