import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import {
  analyzeEtsySeo,
  createOptimizedEtsyDescription,
  createOptimizedEtsyTags,
  createOptimizedEtsyTitle,
  getRepeatedTitleWords,
} from '../etsySeo';

describe('Etsy SEO helpers', () => {
  it('creates a concise product-first title with the mask count', () => {
    const project = createDefaultProject();
    const title = createOptimizedEtsyTitle(project);

    expect(title).toContain(String(project.subjects.length));
    expect(title).toMatch(/Printable Masks/i);
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
  });

  it('creates 13 unique tags that fit Etsy tag length limits', () => {
    const tags = createOptimizedEtsyTags(createDefaultProject());

    expect(tags).toHaveLength(13);
    expect(new Set(tags).size).toBe(13);
    expect(tags.every((tag) => tag.length <= 20)).toBe(true);
  });

  it('detects excessive repeated title words', () => {
    expect(getRepeatedTitleWords('Printable masks, kids masks, paper masks, party masks')).toEqual([
      'masks',
    ]);
  });

  it('analyzes title, tags, and description readiness', () => {
    const project = createDefaultProject();
    const tags = createOptimizedEtsyTags(project);
    const description = createOptimizedEtsyDescription({
      ...project,
      settings: {
        ...project.settings,
        tags: tags.join(', '),
      },
    });
    const analysis = analyzeEtsySeo({
      ...project,
      settings: {
        ...project.settings,
        title: createOptimizedEtsyTitle(project),
        tags: tags.join(', '),
        description,
      },
    });

    expect(analysis.checks.find((check) => check.id === 'title-word-count')?.passed).toBe(true);
    expect(analysis.checks.find((check) => check.id === 'tags-count')?.passed).toBe(true);
    expect(analysis.checks.find((check) => check.id === 'description-depth')?.passed).toBe(true);
    expect(analysis.suggestedDescription).toContain('What is included');
  });
});
