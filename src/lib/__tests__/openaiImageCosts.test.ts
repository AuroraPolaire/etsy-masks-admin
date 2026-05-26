import { describe, expect, it } from 'vitest';

import {
  formatUsdEstimate,
  getEstimatedOpenAIImageCost,
  getOpenAIImageCostComparison,
} from '../openaiImageCosts';

describe('OpenAI image cost estimates', () => {
  it('estimates GPT Image 1.5 high square generation cost', () => {
    expect(getEstimatedOpenAIImageCost('gpt-image-1.5', 'high', '1024x1024')).toMatchObject({
      costUsd: 0.133,
      usesFallbackAssumption: false,
    });
  });

  it('estimates GPT Image 2 bundle costs', () => {
    const estimates = getOpenAIImageCostComparison('high', '1024x1536', 3, 12);
    const gptImage2 = estimates.find((estimate) => estimate.model === 'gpt-image-2');

    expect(gptImage2?.oneImageUsd).toBe(0.165);
    expect(gptImage2?.missingImagesUsd).toBeCloseTo(0.495);
    expect(gptImage2?.fullBundleUsd).toBeCloseTo(1.98);
    expect(gptImage2?.fullBundleWithColoringPagesUsd).toBeCloseTo(3.96);
  });

  it('marks auto settings as estimated with fallback assumptions', () => {
    expect(getEstimatedOpenAIImageCost('gpt-image-2', 'auto', 'auto')).toMatchObject({
      estimatedQuality: 'medium',
      estimatedSize: '1024x1024',
      usesFallbackAssumption: true,
    });
  });

  it('formats small image costs without rounding to zero', () => {
    expect(formatUsdEstimate(0.006)).toBe('$0.006');
    expect(formatUsdEstimate(0.133)).toBe('$0.13');
  });
});
