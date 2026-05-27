import { describe, expect, it } from 'vitest';

import { createRunFileHeaders } from '../index';
import { buildMarketingSceneEditFormData } from '../openaiProxy';
import { createRunRevisionFileManifest } from '../storage';

import type { FileRow } from '../types';

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

describe('worker run revision manifests', () => {
  const createFileRow = (overrides: Partial<FileRow> = {}): FileRow => ({
    id: 'file-1',
    run_id: 'run-1',
    project_id: 'project-1',
    object_id: 'object-1',
    r2_key: 'runs/run-1/objects/object-1/mask.png',
    name: 'mask.png',
    original_name: 'mask.png',
    size: 1234,
    type: 'image/png',
    kind: 'uploaded',
    added_at: '2026-05-27T10:00:00.000Z',
    review_state: 'approved',
    review_notes: 'ready',
    mapped_subject_id: 'subject-1',
    asset_variant: 'marketing-slogan',
    source_file_id: 'source-1',
    metadata_json: JSON.stringify({
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'preview',
      },
    }),
    explicitly_confirmed: 1,
    image_width: 1024,
    image_height: 1024,
    thumbnail_r2_key: 'runs/run-1/objects/object-1/thumbnail-mask.png.webp',
    thumbnail_size: 456,
    thumbnail_type: 'image/webp',
    thumbnail_updated_at: '2026-05-27T10:00:01.000Z',
    updated_at: '2026-05-27T10:00:02.000Z',
    ...overrides,
  });

  it('keeps immutable object references and flexible metadata in revision manifests', () => {
    const [manifest] = createRunRevisionFileManifest([createFileRow()]);

    expect(manifest).toBeDefined();
    expect(manifest).toMatchObject({
      id: 'file-1',
      objectId: 'object-1',
      r2Key: 'runs/run-1/objects/object-1/mask.png',
      assetVariant: 'marketing-slogan',
      explicitlyConfirmed: true,
      imageWidth: 1024,
      thumbnailR2Key: 'runs/run-1/objects/object-1/thumbnail-mask.png.webp',
    });
    expect(manifest?.metadataJson).toContain('marketingAsset');
  });
});

describe('worker OpenAI marketing image requests', () => {
  it('sends approved masks as image array inputs without high quality or input fidelity', () => {
    const formData = buildMarketingSceneEditFormData({
      settings: {
        model: 'gpt-image-2',
        size: '512x512',
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
    expect(formData.get('size')).toBe('1024x1024');
    expect(formData.get('quality')).toBe('medium');
    expect(formData.get('input_fidelity')).toBeNull();
    expect(formData.getAll('image[]')).toHaveLength(2);
    expect(formData.get('prompt')).toContain('printable paper masks made from A4 paper');
    expect(formData.get('prompt')).toContain('flat paper craft masks');
    expect(formData.get('prompt')).toContain('Do not render masks as molded plastic');
  });
});
