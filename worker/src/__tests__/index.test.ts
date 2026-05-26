import { describe, expect, it } from 'vitest';

import { createRunFileHeaders } from '../index';

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
