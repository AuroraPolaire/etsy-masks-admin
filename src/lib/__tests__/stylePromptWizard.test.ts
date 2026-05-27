import { describe, expect, it } from 'vitest';

import {
  createStylePromptFromWizardValues,
  createStylePromptWizardValues,
} from '../stylePromptWizard';
import { initialPromptStyleTemplates } from '../styleTemplates';

describe('style prompt wizard builder', () => {
  it('creates editable defaults from template style sections', () => {
    const [template] = initialPromptStyleTemplates;
    if (!template) {
      throw new Error('Expected at least one style template.');
    }

    const values = createStylePromptWizardValues(template);

    expect(values.maskStyle).toContain('only eye holes');
    expect(values.colorPainting).toContain('clean white print background');
    expect(values.coloringPageLines).toContain('large colorable areas');
  });

  it('composes helper fields into one backend prompt string', () => {
    const [template] = initialPromptStyleTemplates;
    if (!template) {
      throw new Error('Expected at least one style template.');
    }

    const values = {
      ...createStylePromptWizardValues(template),
      bundleIdea: 'Woodland animal masks for a preschool birthday party',
      topics: 'Fox, owl, bear, deer',
      targetMaskCount: '8',
      audienceUseCase: 'Preschool teachers and parents',
      seoMarketplaceAngle: 'Printable digital download for Etsy party craft buyers',
      safetyPrintingEmphasis: 'Adult supervision, printable PNG files, no physical item shipped',
      extraNotes: 'Keep the mood gentle and classroom friendly',
    };

    const prompt = createStylePromptFromWizardValues(template, values);

    expect(prompt).toContain('Bundle idea/theme: Woodland animal masks');
    expect(prompt).toContain('Topics: Fox, owl, bear, deer.');
    expect(prompt).toContain('Target mask count: 8.');
    expect(prompt).toContain('Audience/use case: Preschool teachers and parents.');
    expect(prompt).toContain('SEO/marketplace angle: Printable digital download');
    expect(prompt).toContain('Safety and printing emphasis: Adult supervision');
    expect(prompt).toContain('Extra notes: Keep the mood gentle');
  });

  it('preserves prompt labels consumed by the brief generator', () => {
    const [template] = initialPromptStyleTemplates;
    if (!template) {
      throw new Error('Expected at least one style template.');
    }

    const prompt = createStylePromptFromWizardValues(
      template,
      createStylePromptWizardValues(template),
    );

    expect(prompt).toContain('Mask style:');
    expect(prompt).toContain('Color painting:');
    expect(prompt).toContain('Coloring page lines:');
    expect(prompt).toContain('only eye holes');
    expect(prompt).toContain('no side punch holes');
  });
});
