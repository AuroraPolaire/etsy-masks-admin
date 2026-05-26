import { describe, expect, it } from 'vitest';

import { createDefaultProject } from '../../constants';
import { createManifest } from '../zipExport';

import type { ManagedFile, QAResult } from '../../types';

const qaResult: QAResult = {
  readinessPercentage: 100,
  status: 'etsy-ready',
  checks: [],
  criticalPassed: true,
};

const createMarketingFile = (): ManagedFile => {
  const file = new File(['image'], 'dinosaur-slogan-final.png', { type: 'image/png' });

  return {
    id: 'marketing-final',
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-26T10:00:00.000Z',
    kind: 'generated-preview',
    assetVariant: 'marketing-slogan',
    reviewState: 'approved',
    reviewNotes: '',
    explicitlyConfirmed: true,
    marketingAsset: {
      type: 'slogan-poster',
      stage: 'final',
      recipeId: 'slogan-1',
      sourceFileIds: ['dino-mask'],
      generatedAt: '2026-05-26T10:00:00.000Z',
      generatedFromSettings: createDefaultProject().marketingSettings.final,
    },
  };
};

describe('zip export manifest', () => {
  it('lists approved final marketing assets as marketplace preview files', () => {
    const manifest = createManifest(createDefaultProject(), [createMarketingFile()], qaResult, 123);

    expect(manifest.marketplacePreviewFiles).toEqual(['dinosaur-slogan-final.png']);
  });
});
