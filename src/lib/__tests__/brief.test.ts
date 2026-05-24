import { describe, expect, it } from 'vitest';

import { createProjectDraftFromInitialPrompt } from '../brief';

describe('brief prompt drafting', () => {
  it('fills settings and extracts known topics from an initial idea', () => {
    const draft = createProjectDraftFromInitialPrompt(
      'Cute woodland masks for preschool with fox, owl, bear, deer, rabbit, and wolf.',
    );

    expect(draft.settings.title).toContain('6 PNG Paper Masks');
    expect(draft.settings.description).toContain('digital download');
    expect(draft.subjects.map((subject) => subject.name)).toEqual([
      'Fox',
      'Wolf',
      'Bear',
      'Rabbit',
      'Deer',
      'Owl',
    ]);
  });
});
