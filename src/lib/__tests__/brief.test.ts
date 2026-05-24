import { describe, expect, it } from 'vitest';

import { createProjectDraftFromInitialPrompt } from '../brief';

describe('brief prompt drafting', () => {
  it('fills settings and extracts known animals from an initial idea', () => {
    const draft = createProjectDraftFromInitialPrompt(
      'Cute woodland animal masks for preschool with fox, owl, bear, deer, rabbit, and wolf.',
    );

    expect(draft.settings.title).toContain('6 PNG Paper Masks');
    expect(draft.settings.description).toContain('digital download');
    expect(draft.animals.map((animal) => animal.name)).toEqual([
      'Fox',
      'Wolf',
      'Bear',
      'Rabbit',
      'Deer',
      'Owl',
    ]);
  });
});
