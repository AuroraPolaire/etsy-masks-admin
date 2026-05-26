import { describe, expect, it } from 'vitest';

import { createProjectDraftFromInitialPrompt } from '../brief';
import { initialPromptStyleTemplates } from '../styleTemplates';

describe('brief prompt drafting', () => {
  it('fills settings and extracts known topics from an initial idea', () => {
    const draft = createProjectDraftFromInitialPrompt(
      'Cute woodland masks for preschool with fox, owl, bear, deer, rabbit, and wolf.',
    );

    expect(draft.settings.title).toContain('6 PNG Paper Masks');
    expect(draft.settings.description).toContain('digital download');
    expect(draft.subjects.map((subject) => subject.name)).toEqual([
      'Fox',
      'Owl',
      'Bear',
      'Deer',
      'Rabbit',
      'Wolf',
    ]);
  });

  it('keeps style template mask and color painting direction in fallback drafts', () => {
    const [styleTemplate] = initialPromptStyleTemplates;
    if (!styleTemplate) {
      throw new Error('Expected at least one style template.');
    }

    const draft = createProjectDraftFromInitialPrompt(styleTemplate.prompt);

    expect(draft.subjects).toEqual([]);
    expect(draft.settings.style).toContain('soft plush-inspired shapes');
    expect(draft.settings.style).toContain('Coloring page');
    expect(draft.settings.style).toContain('no side punch holes');
  });

  it('keeps style templates complete and uniquely selectable', () => {
    const ids = new Set(initialPromptStyleTemplates.map((template) => template.id));
    const prompts = new Set(initialPromptStyleTemplates.map((template) => template.prompt));

    expect(initialPromptStyleTemplates.length).toBeGreaterThanOrEqual(16);
    expect(ids.size).toBe(initialPromptStyleTemplates.length);
    expect(prompts.size).toBe(initialPromptStyleTemplates.length);
    for (const template of initialPromptStyleTemplates) {
      expect(template.prompt).toContain('Mask style:');
      expect(template.prompt).toContain('Color painting:');
      expect(template.prompt).toContain('Coloring page lines:');
      expect(template.prompt).toContain('only eye holes');
      expect(template.prompt).toContain('no side punch holes');
    }
  });

  it('does not inject mocked topics when the initial idea is vague', () => {
    const draft = createProjectDraftFromInitialPrompt('Printable party masks for kids.');

    expect(draft.subjects).toEqual([]);
    expect(draft.settings.title).not.toContain('12 PNG Paper Masks');
  });
});
