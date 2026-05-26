import { describe, expect, it } from 'vitest';

import { createRunFileHeaders } from '../index';
import { buildMarketingSceneEditFormData } from '../openaiProxy';

describe('worker file responses', () => {
  it('sets cache validators and private cache headers for versioned file downloads', () => {
    const headers = createRunFileHeaders({
      request: new Request('https://example.com/api/runs/run-1/files/file-1?v=2026-05-26'),
      object: {
        httpEtag: '"r2-etag"',
        httpMetadata: { contentType: 'image/png' },
        writeHttpMetadata: () => undefined,
      },
      row: {
        name: 'moon.png',
        type: 'application/octet-stream',
        size: 1234,
      },
    });

    expect(headers.get('Content-Type')).toBe('image/png');
    expect(headers.get('Content-Length')).toBe('1234');
    expect(headers.get('ETag')).toBe('"r2-etag"');
    expect(headers.get('Cache-Control')).toBe('private, max-age=3600');
  });

  it('keeps unversioned file downloads uncached by default', () => {
    const headers = createRunFileHeaders({
      request: new Request('https://example.com/api/runs/run-1/files/file-1'),
      object: {
        httpEtag: '"r2-etag"',
        httpMetadata: {},
        writeHttpMetadata: () => undefined,
      },
      row: {
        name: 'moon.png',
        type: 'image/png',
        size: 1234,
      },
    });

    expect(headers.get('Content-Type')).toBe('image/png');
    expect(headers.get('Cache-Control')).toBeNull();
  });
});

describe('worker OpenAI marketing image requests', () => {
  it('sends approved masks as image array inputs without high quality or input fidelity', () => {
    const formData = buildMarketingSceneEditFormData({
      settings: {
        model: 'gpt-image-2',
        size: '2048x2048',
        quality: 'high',
        background: 'opaque',
        outputFormat: 'png',
      },
      project: {
        theme: 'Dinosaur masks',
        title: 'Dinosaur Printable Masks',
        audience: 'Kids',
        style: 'Printable paper masks',
        slogan: 'Dinosaur masks for kids',
      },
      recipe: {
        type: 'children-scene',
        id: 'party-table',
        optionIndex: 0,
        stage: 'final',
        maskCount: 2,
      },
      images: [
        new Blob(['mask-1'], { type: 'image/png' }),
        new Blob(['mask-2'], { type: 'image/png' }),
      ],
    });

    expect(formData.get('model')).toBe('gpt-image-2');
    expect(formData.get('quality')).toBe('medium');
    expect(formData.get('input_fidelity')).toBeNull();
    expect(formData.getAll('image[]')).toHaveLength(2);
  });
});
