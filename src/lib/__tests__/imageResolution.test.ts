import { describe, expect, it } from 'vitest';

import { finalImageResolutionValues, parseFinalImageResolution } from '../imageResolution';

describe('final image resolution helpers', () => {
  it('includes 4K output combinations', () => {
    expect(finalImageResolutionValues).toContain('4096x4096');
    expect(finalImageResolutionValues).toContain('4096x3072');
    expect(finalImageResolutionValues).toContain('4096x2736');
    expect(finalImageResolutionValues).toContain('4096x2304');
  });

  it('parses concrete output dimensions and preserves native output', () => {
    expect(parseFinalImageResolution('native')).toBeNull();
    expect(parseFinalImageResolution('3840x2160')).toEqual({ width: 3840, height: 2160 });
  });
});
