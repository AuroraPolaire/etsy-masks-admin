import { describe, expect, it } from 'vitest';

import { createRunFileHeaders } from '../index';
import {
  buildColoringPageEditFormData,
  buildColoringPagePrompt,
  buildImageRequestBody,
  buildMarketingSceneEditFormData,
  buildMarketingSceneGenerationRequestBody,
} from '../openaiProxy';
import { createRunRevisionFileManifest, shouldCreateRunRevisionForSnapshot } from '../storage';

import type { CreateRunRevisionInput } from '../storage';
import type { FileRow, RunRevisionRow } from '../types';

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

  it('skips automatic checkpoints when the latest revision has the same saved state', () => {
    const input: CreateRunRevisionInput = {
      stage: 'masks',
      kind: 'generation',
      label: 'Masks saved',
    };
    const latestRevision: RunRevisionRow = {
      id: 'revision-1',
      run_id: 'run-1',
      project_id: 'project-1',
      parent_revision_id: null,
      sequence_number: 1,
      stage: 'masks',
      kind: 'generation',
      label: 'Masks saved',
      description: null,
      project_json: '{"id":"project-1"}',
      file_manifest_json: '[{"id":"file-1"}]',
      change_summary_json: null,
      thumbnail_file_id: null,
      file_count: 1,
      total_size_bytes: 1234,
      is_manual: 0,
      is_pinned: 0,
      restored_from_revision_id: null,
      created_at: '2026-05-27T10:00:00.000Z',
    };

    expect(
      shouldCreateRunRevisionForSnapshot(input, latestRevision, {
        projectJson: '{"id":"project-1"}',
        fileManifestJson: '[{"id":"file-1"}]',
        fileCount: 1,
        totalSizeBytes: 1234,
      }),
    ).toBe(false);

    expect(
      shouldCreateRunRevisionForSnapshot(input, latestRevision, {
        projectJson: '{"id":"project-1","changed":true}',
        fileManifestJson: '[{"id":"file-1"}]',
        fileCount: 1,
        totalSizeBytes: 1234,
      }),
    ).toBe(true);
  });

  it('always allows manual checkpoints even when saved state matches the latest revision', () => {
    const input: CreateRunRevisionInput = {
      stage: 'masks',
      kind: 'manual',
      label: 'Named restore point',
      isManual: true,
    };
    const latestRevision = {
      project_json: '{"id":"project-1"}',
      file_manifest_json: '[]',
      file_count: 0,
      total_size_bytes: 0,
    } as RunRevisionRow;

    expect(
      shouldCreateRunRevisionForSnapshot(input, latestRevision, {
        projectJson: '{"id":"project-1"}',
        fileManifestJson: '[]',
        fileCount: 0,
        totalSizeBytes: 0,
      }),
    ).toBe(true);
  });
});

describe('worker OpenAI mask image requests', () => {
  const promptItem = {
    expectedFilename: 'sheriff-cowboy-hat.png',
    prompt:
      'Mask style: western sheriff hat mask. Color painting: rich brown leather and gold star. Subject: Sheriff Cowboy Hat.',
    coloringPagePrompt:
      'Create a separate black-and-white coloring page for the Sheriff Cowboy Hat mask. Preserve the star and stitching as smooth line art.',
    negativeRequirements:
      'no multiple masks, no paired color and line-art preview, no coloring page in the color mask image',
  };

  it('blocks paired color and coloring-page layouts in color mask generation', () => {
    const body = buildImageRequestBody(
      {
        model: 'gpt-image-2',
        size: '1024x1024',
        quality: 'low',
        background: 'opaque',
        outputFormat: 'png',
      },
      promptItem,
    );

    expect(body.prompt).toContain('exactly one color mask image');
    expect(body.prompt).toContain('Do not include a black-and-white coloring page');
    expect(body.prompt).toContain('no paired color and line-art preview');
  });

  it('uses the separate coloring page prompt for coloring-page edits', () => {
    const prompt = buildColoringPagePrompt(promptItem);

    expect(prompt).toContain('Separate coloring-page prompt');
    expect(prompt).toContain('Preserve the star and stitching as smooth line art');
    expect(prompt).toContain('Output only the coloring page');
    expect(prompt).toContain('Color mask prompt context');
  });

  it('always requests 1024 square coloring-page edits', () => {
    const formData = buildColoringPageEditFormData({
      settings: {
        model: 'gpt-image-1.5',
        size: '1536x1536',
        quality: 'medium',
        background: 'opaque',
        outputFormat: 'png',
      },
      promptItem,
      image: new Blob(['mask'], { type: 'image/png' }),
    });

    expect(formData.get('size')).toBe('1024x1024');
  });
});

describe('worker OpenAI marketing image requests', () => {
  it('sends ready masks as image array inputs without high quality or input fidelity', () => {
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
        customPrompt: 'Use a visible home printer in the craft scene',
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
    expect(formData.get('prompt')).toContain('Use a visible home printer');
    expect(formData.get('prompt')).toContain('Do not render masks as molded plastic');
  });

  it('builds text-only slogan poster generation requests without image inputs', () => {
    const body = buildMarketingSceneGenerationRequestBody({
      settings: {
        model: 'gpt-image-2',
        size: '512x512',
        quality: 'high',
        background: 'transparent',
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
        type: 'slogan-poster',
        id: 'slogan-1',
        optionIndex: 0,
        stage: 'final',
        maskCount: 0,
      },
      images: [],
    });

    expect(body).toMatchObject({
      model: 'gpt-image-2',
      size: '1024x1024',
      quality: 'medium',
      background: 'opaque',
      output_format: 'png',
    });
    expect(body.prompt).toContain('The exact slogan must be the only visible text.');
    expect(body.prompt).toContain('Do not include masks');
    expect(body.prompt).toContain('Wrap and scale the slogan');
    expect(body.prompt).not.toContain('provided ready mask image reference');
  });
});
