import type { InitialPromptStyleTemplate } from './styleTemplates';

export type StylePromptWizardValues = {
  bundleIdea: string;
  topics: string;
  targetMaskCount: string;
  audienceUseCase: string;
  seoMarketplaceAngle: string;
  safetyPrintingEmphasis: string;
  extraNotes: string;
  maskStyle: string;
  colorPainting: string;
  coloringPageLines: string;
};

type PromptSection = 'Mask style' | 'Color painting' | 'Coloring page lines';

const getPromptSection = (template: InitialPromptStyleTemplate, section: PromptSection): string => {
  const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escapedSection}:\\s*(.+)$`, 'im').exec(template.prompt);

  return match?.[1]?.trim() ?? '';
};

const normalizeLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const appendValueLine = (lines: string[], label: string, value: string): void => {
  const normalizedValue = normalizeLine(value);
  if (normalizedValue.length > 0) {
    const sentence = /[.!?]$/.test(normalizedValue) ? normalizedValue : `${normalizedValue}.`;
    lines.push(`${label}: ${sentence}`);
  }
};

export const createStylePromptWizardValues = (
  template: InitialPromptStyleTemplate,
): StylePromptWizardValues => ({
  bundleIdea: '',
  topics: '',
  targetMaskCount: '12',
  audienceUseCase:
    'Parents, teachers, and kids planning birthday parties, classroom crafts, storytelling, or pretend play.',
  seoMarketplaceAngle:
    'Etsy digital download with buyer-readable wording for printable paper masks, party craft, classroom activity, and kids costume play.',
  safetyPrintingEmphasis:
    'Printable PNG/PDF paper craft, adult supervision, not intended for children under 3, no physical item shipped.',
  extraNotes: '',
  maskStyle: getPromptSection(template, 'Mask style'),
  colorPainting: getPromptSection(template, 'Color painting'),
  coloringPageLines: getPromptSection(template, 'Coloring page lines'),
});

export const createStylePromptFromWizardValues = (
  template: InitialPromptStyleTemplate,
  values: StylePromptWizardValues,
): string => {
  const lines = [`Create a printable kids mask bundle using a ${template.name} visual preference.`];

  appendValueLine(lines, 'Bundle idea/theme', values.bundleIdea);
  appendValueLine(lines, 'Topics', values.topics);
  appendValueLine(lines, 'Target mask count', values.targetMaskCount);
  appendValueLine(lines, 'Audience/use case', values.audienceUseCase);
  appendValueLine(lines, 'SEO/marketplace angle', values.seoMarketplaceAngle);
  appendValueLine(lines, 'Safety and printing emphasis', values.safetyPrintingEmphasis);
  appendValueLine(lines, 'Extra notes', values.extraNotes);
  appendValueLine(lines, 'Mask style', values.maskStyle);
  appendValueLine(lines, 'Color painting', values.colorPainting);
  appendValueLine(lines, 'Coloring page lines', values.coloringPageLines);
  lines.push('Choose safe, original topics that fit this style unless I add specific topics.');

  return lines.join('\n');
};
