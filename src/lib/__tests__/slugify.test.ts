import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify';

describe('slugify', () => {
  it('creates safe lowercase slugs', () => {
    expect(slugify('Realistic Animal Masks!')).toBe('realistic-animal-masks');
  });

  it('normalizes accents and ampersands', () => {
    expect(slugify('Renée & Fox Mask')).toBe('renee-and-fox-mask');
  });

  it('falls back for empty input', () => {
    expect(slugify('---')).toBe('untitled');
  });
});
