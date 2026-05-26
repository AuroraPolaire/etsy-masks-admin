import { describe, expect, it } from 'vitest';

import { normalizeAiProjectDraft, parseOpenAIProjectBriefResponse } from '../openaiBrief';

describe('OpenAI brief generation helpers', () => {
  it('normalizes a project draft from AI JSON', () => {
    const draft = normalizeAiProjectDraft({
      title: 'Space Printable Masks, 6 Kids Paper Masks',
      theme: 'Space Masks',
      audience: 'Kids and teachers',
      marketplace: 'Etsy',
      style: 'Realistic printable mask for kids',
      description: 'Printable space mask digital download. No physical item will be shipped.',
      tags: ['space masks', 'printable masks'],
      safetyNote: 'Adult supervision required. Not intended for children under 3.',
      printingInstructions: 'Print at 100% scale on cardstock.',
      license: 'Personal and classroom use only.',
      refundPolicy: 'No refunds for digital downloads.',
      subjects: ['Astronaut', 'Rocket'],
      etsySeoAnalysis: {
        titleWordCount: 6,
        firstTitleSegment: 'Space Printable Masks',
        tags: ['space masks', 'printable masks'],
        repeatedTitleWords: [],
        suggestedTitle: 'Space Printable Masks, 2 Kids Paper Masks',
        suggestedTags: ['space masks', 'printable masks'],
        suggestedDescription: 'Printable space mask bundle for kids.',
        checks: [
          {
            id: 'tags-count',
            label: 'Uses tags',
            passed: true,
            details: 'Generated tag set is usable.',
          },
        ],
      },
    });

    expect(draft.settings.theme).toBe('Space Masks');
    expect(draft.settings.tags).toBe('space masks, printable masks');
    expect(draft.subjects.map((subject) => subject.name)).toEqual(['Astronaut', 'Rocket']);
    expect(draft.etsySeoAnalysis?.suggestedTitle).toContain('Space Printable Masks');
  });

  it('parses output_text from a Responses API response', () => {
    const draft = parseOpenAIProjectBriefResponse({
      output_text: JSON.stringify({
        title: 'Garden Printable Masks, 4 Kids Paper Masks',
        theme: 'Garden Masks',
        audience: 'Kids',
        marketplace: 'Etsy',
        style: 'Watercolor printable masks',
        description: 'Printable garden mask digital download. No physical item will be shipped.',
        tags: ['garden masks'],
        safetyNote: 'Adult supervision required. Not intended for children under 3.',
        printingInstructions: 'Print and cut.',
        license: 'Personal use only.',
        refundPolicy: 'No refunds for digital files.',
        subjects: ['Flower', 'Bee'],
      }),
    });

    expect(draft.settings.title).toContain('Garden Printable Masks');
    expect(draft.subjects).toHaveLength(2);
  });
});
