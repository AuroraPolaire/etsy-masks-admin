import type { OpenAIImageQuality, OpenAIImageSize } from '../types';

export type EstimatedImageCostModel = 'gpt-image-1.5' | 'gpt-image-2';

type EstimatedQuality = Exclude<OpenAIImageQuality, 'auto'>;
type EstimatedSize = Exclude<OpenAIImageSize, 'auto'>;

type ImageCostEstimate = {
  model: EstimatedImageCostModel;
  requestedQuality: OpenAIImageQuality;
  requestedSize: OpenAIImageSize;
  estimatedQuality: EstimatedQuality;
  estimatedSize: EstimatedSize;
  costUsd: number;
  usesFallbackAssumption: boolean;
};

type ImageCostComparison = ImageCostEstimate & {
  oneImageUsd: number;
  missingImagesUsd: number;
  fullBundleUsd: number;
};

const DEFAULT_ESTIMATE_QUALITY: EstimatedQuality = 'medium';
const DEFAULT_ESTIMATE_SIZE: EstimatedSize = '1024x1024';

const ESTIMATED_COST_USD: Record<
  EstimatedImageCostModel,
  Record<EstimatedQuality, Record<EstimatedSize, number>>
> = {
  'gpt-image-1.5': {
    low: {
      '1024x1024': 0.009,
      '1024x1536': 0.013,
      '1536x1024': 0.013,
    },
    medium: {
      '1024x1024': 0.034,
      '1024x1536': 0.05,
      '1536x1024': 0.05,
    },
    high: {
      '1024x1024': 0.133,
      '1024x1536': 0.2,
      '1536x1024': 0.2,
    },
  },
  'gpt-image-2': {
    low: {
      '1024x1024': 0.006,
      '1024x1536': 0.005,
      '1536x1024': 0.005,
    },
    medium: {
      '1024x1024': 0.053,
      '1024x1536': 0.041,
      '1536x1024': 0.041,
    },
    high: {
      '1024x1024': 0.211,
      '1024x1536': 0.165,
      '1536x1024': 0.165,
    },
  },
};

const normalizeQuality = (quality: OpenAIImageQuality): EstimatedQuality =>
  quality === 'auto' ? DEFAULT_ESTIMATE_QUALITY : quality;

const normalizeSize = (size: OpenAIImageSize): EstimatedSize =>
  size === 'auto' ? DEFAULT_ESTIMATE_SIZE : size;

export const getEstimatedOpenAIImageCost = (
  model: EstimatedImageCostModel,
  quality: OpenAIImageQuality,
  size: OpenAIImageSize,
): ImageCostEstimate => {
  const estimatedQuality = normalizeQuality(quality);
  const estimatedSize = normalizeSize(size);

  return {
    model,
    requestedQuality: quality,
    requestedSize: size,
    estimatedQuality,
    estimatedSize,
    costUsd: ESTIMATED_COST_USD[model][estimatedQuality][estimatedSize],
    usesFallbackAssumption: quality === 'auto' || size === 'auto',
  };
};

export const getOpenAIImageCostComparison = (
  quality: OpenAIImageQuality,
  size: OpenAIImageSize,
  missingImageCount: number,
  subjectCount: number,
): ImageCostComparison[] =>
  (['gpt-image-1.5', 'gpt-image-2'] as const).map((model) => {
    const estimate = getEstimatedOpenAIImageCost(model, quality, size);

    return {
      ...estimate,
      oneImageUsd: estimate.costUsd,
      missingImagesUsd: estimate.costUsd * missingImageCount,
      fullBundleUsd: estimate.costUsd * subjectCount,
    };
  });

export const formatUsdEstimate = (value: number): string => {
  if (value > 0 && value < 0.01) {
    return `$${value.toFixed(3)}`;
  }

  return `$${value.toFixed(2)}`;
};
