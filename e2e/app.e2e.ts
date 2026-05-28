import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lFkU4QAAAABJRU5ErkJggg==',
  'base64',
);

const waitForUiToSettle = async (page: Page) => {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
};

const fillCompleteBrief = async (page: Page) => {
  await page.getByLabel('Listing title').fill('Moon Printable Mask, 1 Kids Paper Mask');
  await page.getByLabel('Bundle theme').fill('Moon party masks');
  await page.getByLabel('Target buyer').fill('Parents and teachers');
  await page.getByLabel('Visual style').fill('Realistic printable paper mask');
  await page
    .getByLabel('Listing description')
    .fill('Printable moon mask for parties, classrooms, and pretend play.');
  await page.getByLabel('Etsy tags').fill('printable mask, moon mask, kids craft, party printable');
  await page
    .getByLabel('Safety note')
    .fill('Adult supervision required. Not intended for children under 3.');
  await page
    .getByLabel('Print instructions')
    .fill('Print at 100% scale on cardstock, cut, and use with supervision.');
  await page.getByLabel('Usage license').fill('Personal and classroom use only.');
  await page.getByLabel('Refund note').fill('Digital downloads are not refundable.');
};

const mockUnavailableBackend = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Backend unavailable in E2E smoke tests' }),
    });
  });
};

const mockOpenAIImageBackend = async (page: Page) => {
  let imageRequestCount = 0;
  let coloringPageRequestCount = 0;
  let uploadFileCount = 0;
  let deleteFileCount = 0;
  let runs = [
    {
      id: 'run-auto-coloring',
      projectId: 'project-1',
      idea: 'Moon party masks',
      status: 'draft',
      createdAt: '2026-05-26T09:00:00.000Z',
      updatedAt: '2026-05-26T09:00:00.000Z',
      fileCount: 0,
      totalSizeBytes: 0,
    },
  ];
  const uploadedFiles: Array<{
    id: string;
    runId: string;
    projectId: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
    kind: string;
    addedAt: string;
    reviewState: string;
    reviewNotes: string;
    assetVariant: string;
    explicitlyConfirmed: boolean;
    updatedAt: string;
  }> = [];

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/api/health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          version: 'test',
          storage: { d1: true, r2: true },
          auth: { mode: 'access', configured: true },
          openaiProxyReady: true,
          maxFileBytes: 52_428_800,
        }),
      });
      return;
    }

    if (url.pathname === '/api/openai/images/coloring-page' && method === 'POST') {
      coloringPageRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fileName: 'moon-coloring-page.png',
          mimeType: 'image/png',
          base64: onePixelPng.toString('base64'),
        }),
      });
      return;
    }

    if (url.pathname === '/api/openai/images' && method === 'POST') {
      imageRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fileName: 'moon.png',
          mimeType: 'image/png',
          base64: onePixelPng.toString('base64'),
        }),
      });
      return;
    }

    if (url.pathname === '/api/openai/brief' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          output_text: JSON.stringify({
            title: 'Unicorn Printable Masks, 2 Kids Paper Masks',
            theme: 'Unicorn party masks',
            audience: 'Parents and teachers',
            marketplace: 'Etsy',
            style: 'Realistic printable unicorn masks',
            description: 'Printable unicorn masks for parties and classroom crafts.',
            tags: ['unicorn mask', 'kids craft', 'party printable'],
            safetyNote: 'Adult supervision required. Not intended for children under 3.',
            printingInstructions: 'Print on cardstock and cut with supervision.',
            license: 'Personal and classroom use only.',
            refundPolicy: 'Digital downloads are not refundable.',
            subjects: ['Rainbow Unicorn', 'Star Unicorn'],
          }),
        }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ runs }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'POST') {
      const requestBody = route.request().postDataJSON() as {
        project?: { id?: string };
        idea?: string;
      };
      const run = {
        id: `run-${runs.length + 1}`,
        projectId: requestBody.project?.id ?? `project-${runs.length + 1}`,
        idea: requestBody.idea ?? 'Generated masks',
        status: 'draft',
        createdAt: '2026-05-26T09:00:00.000Z',
        updatedAt: '2026-05-26T09:00:00.000Z',
        fileCount: 0,
        totalSizeBytes: 0,
      };
      runs = [run, ...runs];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run }),
      });
      return;
    }

    const runMatch = /^\/api\/runs\/([^/]+)$/.exec(url.pathname);
    if (runMatch?.[1] && method === 'GET') {
      const runId = decodeURIComponent(runMatch[1]);
      const run = runs.find((item) => item.id === runId) ?? runs[0];
      const runFiles = uploadedFiles.filter((file) => file.runId === runId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          runId,
          idea: run?.idea ?? 'Generated masks',
          status: run?.status ?? 'draft',
          project: null,
          updatedAt: run?.updatedAt ?? '2026-05-26T09:00:00.000Z',
          files: runFiles,
          events: [],
        }),
      });
      return;
    }

    if (runMatch?.[1] && method === 'PUT') {
      const requestBody = route.request().postDataJSON() as {
        project?: { id?: string };
        idea?: string;
      };
      const runId = decodeURIComponent(runMatch[1]);
      const currentRun = runs.find((run) => run.id === runId);
      const updatedRun = {
        ...(currentRun ?? runs[0]),
        id: runId,
        projectId: requestBody.project?.id ?? currentRun?.projectId ?? 'project-1',
        idea: requestBody.idea ?? currentRun?.idea ?? 'Generated masks',
        updatedAt: '2026-05-26T09:01:00.000Z',
      };
      runs = [updatedRun, ...runs.filter((run) => run.id !== runId)];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run: updatedRun }),
      });
      return;
    }

    const fileMatch = /^\/api\/runs\/([^/]+)\/files\/([^/]+)$/.exec(url.pathname);
    if (fileMatch?.[1] && fileMatch[2] && method === 'PUT') {
      uploadFileCount += 1;
      const runId = decodeURIComponent(fileMatch[1]);
      const fileId = decodeURIComponent(fileMatch[2]);
      const run = runs.find((item) => item.id === runId) ?? runs[0];
      uploadedFiles.push({
        id: fileId,
        runId,
        projectId: run?.projectId ?? 'project-1',
        name: `${fileId}.png`,
        originalName: `${fileId}.png`,
        size: onePixelPng.byteLength,
        type: 'image/png',
        kind: 'generated-preview',
        addedAt: '2026-05-26T09:01:00.000Z',
        reviewState: 'pending',
        reviewNotes: '',
        assetVariant: 'color',
        explicitlyConfirmed: false,
        updatedAt: '2026-05-26T09:01:00.000Z',
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (fileMatch?.[1] && fileMatch[2] && method === 'DELETE') {
      deleteFileCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, runs: [] }),
    });
  });

  return {
    getImageRequestCount: () => imageRequestCount,
    getColoringPageRequestCount: () => coloringPageRequestCount,
    getUploadFileCount: () => uploadFileCount,
    getDeleteFileCount: () => deleteFileCount,
  };
};

const mockSavedRunsBackend = async (page: Page) => {
  const project = {
    id: 'project-1',
    settings: {
      title: 'Ocean Masks, 2 Kids Paper Masks',
      theme: 'Ocean party masks',
      audience: 'Parents and teachers',
      marketplace: 'Etsy',
      style: 'Clean printable masks',
      description: 'Digital download. No physical item will be shipped.',
      tags: 'ocean mask, kids craft',
      safetyNote: 'Adult supervision required. Not intended for children under 3.',
      printingInstructions: 'Print on cardstock.',
      license: 'Personal and classroom use.',
      refundPolicy: 'Digital downloads are not refundable.',
    },
    subjects: [
      { id: 'sea-turtle', name: 'Sea Turtle' },
      { id: 'starfish', name: 'Starfish' },
    ],
    pdfSettings: {
      generateA4: true,
      generateUSLetter: true,
      maskScale: 'medium',
      showSubjectLabel: true,
      showInstructionFooter: true,
      pageMarginMm: 10,
      includeCalibrationPage: false,
    },
    openAIImageSettings: {
      model: 'gpt-image-2',
      size: '1024x1024',
      quality: 'low',
      background: 'opaque',
      outputFormat: 'png',
    },
    createdAt: '2026-05-26T09:00:00.000Z',
    updatedAt: '2026-05-26T09:35:00.000Z',
    lastBriefUpdatedAt: '2026-05-26T09:35:00.000Z',
  };
  let runs = [
    {
      id: 'run-ocean-001',
      projectId: 'project-1',
      idea: 'Ocean birthday masks',
      status: 'draft',
      createdAt: '2026-05-26T09:00:00.000Z',
      updatedAt: '2026-05-26T09:35:00.000Z',
      fileCount: 4,
      totalSizeBytes: 1_843_200,
    },
    {
      id: 'run-halloween-002',
      projectId: 'project-1',
      idea: 'Halloween classroom masks',
      status: 'draft',
      createdAt: '2026-05-26T08:00:00.000Z',
      updatedAt: '2026-05-26T08:25:00.000Z',
      fileCount: 8,
      totalSizeBytes: 3_145_728,
    },
  ];
  let healthRequestCount = 0;
  let listRunsRequestCount = 0;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/api/health') {
      healthRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          version: 'test',
          storage: { d1: true, r2: true },
          auth: { mode: 'access', configured: true },
          openaiProxyReady: true,
          maxFileBytes: 52_428_800,
        }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'GET') {
      listRunsRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ runs }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run: runs[0] }),
      });
      return;
    }

    const runId = /^\/api\/runs\/([^/]+)$/.exec(url.pathname)?.[1];
    if (runId && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          runId,
          idea: runs.find((run) => run.id === runId)?.idea ?? 'Saved run',
          status: 'draft',
          project:
            runId === 'run-halloween-002'
              ? {
                  ...project,
                  settings: {
                    ...project.settings,
                    title: 'Halloween Masks, 4 Kids Paper Masks',
                    theme: 'Halloween classroom masks',
                  },
                  subjects: [
                    { id: 'pumpkin', name: 'Pumpkin' },
                    { id: 'ghost', name: 'Ghost' },
                    { id: 'bat', name: 'Bat' },
                    { id: 'cat', name: 'Cat' },
                  ],
                }
              : project,
          updatedAt: runs.find((run) => run.id === runId)?.updatedAt,
          files: [],
          events: [],
        }),
      });
      return;
    }

    if (runId && method === 'DELETE') {
      runs = runs.filter((run) => run.id !== runId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, run: runs[0] }),
    });
  });

  return {
    getHealthRequestCount: () => healthRequestCount,
    getListRunsRequestCount: () => listRunsRequestCount,
  };
};

const createRefreshDraftProject = () => ({
  id: 'project-refresh-1',
  settings: {
    title: 'Refresh Masks, 1 Kids Paper Mask',
    theme: 'Refresh masks',
    audience: 'Parents and teachers',
    marketplace: 'Etsy',
    style: 'Clean printable masks',
    description: 'Digital download. No physical item will be shipped.',
    tags: 'refresh mask, kids craft',
    safetyNote: 'Adult supervision required. Not intended for children under 3.',
    printingInstructions: 'Print on cardstock.',
    license: 'Personal and classroom use.',
    refundPolicy: 'Digital downloads are not refundable.',
  },
  subjects: [{ id: 'moon', name: 'Moon' }],
  pdfSettings: {
    generateA4: true,
    generateUSLetter: true,
    maskScale: 'medium',
    showSubjectLabel: true,
    showInstructionFooter: true,
    pageMarginMm: 10,
    includeCalibrationPage: false,
  },
  openAIImageSettings: {
    model: 'gpt-image-2',
    size: '1024x1024',
    quality: 'low',
    background: 'opaque',
    outputFormat: 'png',
  },
  createdAt: '2026-05-26T09:00:00.000Z',
  updatedAt: '2026-05-26T09:40:00.000Z',
  lastBriefUpdatedAt: '2026-05-26T09:40:00.000Z',
});

const mockRefreshDraftBackend = async (page: Page) => {
  const project = createRefreshDraftProject();
  const run = {
    id: 'run-refresh-001',
    projectId: project.id,
    idea: 'Refresh masks',
    status: 'draft',
    createdAt: '2026-05-26T09:00:00.000Z',
    updatedAt: '2026-05-26T09:40:00.000Z',
    fileCount: 1,
    totalSizeBytes: onePixelPng.byteLength,
  };
  const file = {
    id: 'file-moon-color',
    runId: run.id,
    projectId: project.id,
    name: 'moon.png',
    originalName: 'moon.png',
    size: onePixelPng.byteLength,
    type: 'image/png',
    kind: 'generated-preview',
    addedAt: '2026-05-26T09:35:00.000Z',
    reviewState: 'approved',
    reviewNotes: 'Approved before refresh.',
    mappedSubjectId: 'moon',
    assetVariant: 'color',
    explicitlyConfirmed: true,
    imageMetadata: { width: 1, height: 1 },
    updatedAt: '2026-05-26T09:40:00.000Z',
  };
  let createRunCount = 0;
  let deleteFileCount = 0;
  let downloadFileCount = 0;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/api/health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          version: 'test',
          storage: { d1: true, r2: true },
          auth: { mode: 'access', configured: true },
          openaiProxyReady: true,
          maxFileBytes: 52_428_800,
        }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ runs: [run] }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'POST') {
      createRunCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run: { ...run, id: 'duplicate-run' } }),
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          runId: run.id,
          idea: run.idea,
          status: run.status,
          project,
          updatedAt: run.updatedAt,
          files: [file],
          events: [],
        }),
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}` && method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run }),
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}/files/${file.id}` && method === 'GET') {
      downloadFileCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: onePixelPng,
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}/files/${file.id}` && method === 'DELETE') {
      deleteFileCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return {
    project,
    getCreateRunCount: () => createRunCount,
    getDeleteFileCount: () => deleteFileCount,
    getDownloadFileCount: () => downloadFileCount,
  };
};

const mockProgressiveRestoreBackend = async (page: Page) => {
  const project = {
    ...createRefreshDraftProject(),
    id: 'project-progressive-1',
    settings: {
      ...createRefreshDraftProject().settings,
      title: 'Progressive Masks, 12 Kids Paper Masks',
      theme: 'Progressive masks',
    },
    subjects: Array.from({ length: 12 }, (_, index) => ({
      id: `subject-${index + 1}`,
      name: `Mask ${index + 1}`,
    })),
  };
  const run = {
    id: 'run-progressive-001',
    projectId: project.id,
    idea: 'Progressive masks',
    status: 'draft',
    createdAt: '2026-05-26T09:00:00.000Z',
    updatedAt: '2026-05-26T09:40:00.000Z',
    fileCount: project.subjects.length,
    totalSizeBytes: onePixelPng.byteLength * project.subjects.length,
  };
  const files = project.subjects.map((subject, index) => ({
    id: `file-${index + 1}`,
    runId: run.id,
    projectId: project.id,
    name: `mask-${index + 1}.png`,
    originalName: `mask-${index + 1}.png`,
    size: onePixelPng.byteLength,
    type: 'image/png',
    kind: 'uploaded',
    addedAt: `2026-05-26T09:35:${String(index).padStart(2, '0')}.000Z`,
    reviewState: 'approved',
    reviewNotes: 'Approved before restore.',
    mappedSubjectId: subject.id,
    assetVariant: 'color',
    explicitlyConfirmed: true,
    imageMetadata: { width: 1, height: 1 },
    updatedAt: `2026-05-26T09:40:${String(index).padStart(2, '0')}.000Z`,
  }));
  let downloadStartedCount = 0;
  let downloadCompletedCount = 0;
  let updateRunCount = 0;
  let deleteFileCount = 0;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/api/health') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          version: 'test',
          storage: { d1: true, r2: true },
          auth: { mode: 'access', configured: true },
          openaiProxyReady: true,
          maxFileBytes: 52_428_800,
        }),
      });
      return;
    }

    if (url.pathname === '/api/runs' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ runs: [run] }),
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          runId: run.id,
          idea: run.idea,
          status: run.status,
          project,
          updatedAt: run.updatedAt,
          files,
          events: [],
        }),
      });
      return;
    }

    if (url.pathname === `/api/runs/${run.id}` && method === 'PUT') {
      updateRunCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, run }),
      });
      return;
    }

    const fileId = /^\/api\/runs\/run-progressive-001\/files\/([^/]+)$/.exec(url.pathname)?.[1];
    if (fileId && method === 'GET') {
      downloadStartedCount += 1;
      if (fileId !== 'file-1') {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      downloadCompletedCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: {
          'Content-Length': `${onePixelPng.byteLength}`,
          ETag: '"one-pixel"',
        },
        body: onePixelPng,
      });
      return;
    }

    if (fileId && method === 'DELETE') {
      deleteFileCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return {
    project,
    run,
    getDownloadStartedCount: () => downloadStartedCount,
    getDownloadCompletedCount: () => downloadCompletedCount,
    getUpdateRunCount: () => updateRunCount,
    getDeleteFileCount: () => deleteFileCount,
  };
};

const prepareCleanPage = async (page: Page) => {
  await mockUnavailableBackend(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
};

const checkSavedWorkStatus = async (page: Page) => {
  const autosaveStatus = page.locator('details').filter({ hasText: 'Autosave status' });
  await autosaveStatus.locator('summary').click();
  await autosaveStatus.getByRole('button', { name: 'Check save status' }).click();
};

test.describe('production workflow', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPage(page);
  });

  test('starts from an empty brief, unlocks image review, and has no frontend secret fields', async ({
    page,
  }) => {
    await page.unroute('**/api/**');
    const backend = await mockOpenAIImageBackend(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Mask Bundle Studio' })).toBeVisible();
    await fillCompleteBrief(page);

    await page.getByRole('button', { name: 'Next: topics and images' }).click();
    await page.getByLabel('Add mask topic').fill('Moon');
    await page.getByRole('button', { name: 'Add topic' }).click();
    await expect(page.getByText('moon.png').first()).toBeVisible();

    await page.getByRole('button', { name: 'Generate mask' }).click();
    await expect.poll(() => backend.getImageRequestCount()).toBe(1);
    await expect(page.getByText('Mask ready').first()).toBeVisible();
    await page.getByRole('button', { name: 'Open full-size color mask preview for Moon' }).click();
    await expect(page.locator('.PhotoView-Portal[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.PhotoView-Portal[role="dialog"]')).toHaveCount(0);
    await expect.poll(() => backend.getColoringPageRequestCount()).toBe(0);
    await expect(page.getByRole('button', { name: 'Generate coloring page' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next: marketing assets' }).click();
    await expect(page.getByText('Generate optional listing graphics')).toBeVisible();
    await page.getByRole('button', { name: 'Next: QA and export' }).click();
    await expect(page.getByRole('heading', { name: 'Export package' })).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Image generation settings' })).toBeVisible();
    await expect(page.getByText('Session OpenAI API key')).toHaveCount(0);

    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saved work' })).toBeVisible();
    await expect(page.getByLabel('Search saved projects')).toBeVisible();
    await expect(page.getByText('Worker API URL')).toHaveCount(0);
    await expect(page.getByText('Admin token')).toHaveCount(0);
    await expect(page.getByText('TODO')).toHaveCount(0);
  });

  test('keeps coloring page generation manual after a color mask is ready', async ({ page }) => {
    await page.unroute('**/api/**');
    const backend = await mockOpenAIImageBackend(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await fillCompleteBrief(page);
    await page.getByRole('button', { name: 'Next: topics and images' }).click();
    await page.getByLabel('Add mask topic').fill('Moon');
    await page.getByRole('button', { name: 'Add topic' }).click();
    await expect(page.getByRole('button', { name: 'Generate mask' })).toBeEnabled();

    await page.getByRole('button', { name: 'Generate mask' }).click();
    await expect.poll(() => backend.getImageRequestCount()).toBe(1);
    await expect(page.getByText('Mask ready').first()).toBeVisible();

    await expect.poll(() => backend.getColoringPageRequestCount()).toBe(0);
    await expect(page.getByRole('button', { name: 'Generate coloring page' })).toBeEnabled();
    await page.getByRole('button', { name: 'Generate coloring page' }).click();
    await expect.poll(() => backend.getColoringPageRequestCount()).toBe(1);
    await expect(page.getByText('moon-coloring-page.png').first()).toBeVisible();
    const completeTopic = page.getByRole('article').filter({ hasText: 'Moon' });
    await expect(completeTopic.getByText('Coloring ready').first()).toBeVisible();
    await expect(completeTopic.getByRole('button', { name: 'Open', exact: true })).toHaveCount(0);
    await expect(page.getByText('Coloring ready').first()).toBeVisible();
  });

  test('separates generated files when replacing a run with a new AI brief', async ({ page }) => {
    await page.unroute('**/api/**');
    const backend = await mockOpenAIImageBackend(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await fillCompleteBrief(page);
    await page.getByRole('button', { name: 'Next: topics and images' }).click();
    await page.getByLabel('Add mask topic').fill('Moon');
    await page.getByRole('button', { name: 'Add topic' }).click();
    await page.getByRole('button', { name: 'Generate mask' }).click();
    await expect.poll(() => backend.getImageRequestCount()).toBe(1);
    await expect(page.getByText('moon.png').first()).toBeVisible();

    await page.getByRole('button', { name: /Idea and brief/ }).click();
    await page.getByLabel('Bundle idea').fill('Unicorn masks');
    await page.getByRole('button', { name: 'Draft brief' }).click();
    await page
      .getByRole('dialog', { name: 'Replace current topics?' })
      .getByRole('button', {
        name: 'Replace topics',
      })
      .click();

    await expect(page.getByText('rainbow-unicorn.png').first()).toBeVisible();
    await expect(page.getByText('moon.png')).toHaveCount(0);
  });

  test('keeps saved files when clearing current tab files', async ({ page }) => {
    await page.unroute('**/api/**');
    const backend = await mockOpenAIImageBackend(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await fillCompleteBrief(page);
    await page.getByRole('button', { name: 'Next: topics and images' }).click();
    await page.getByLabel('Add mask topic').fill('Moon');
    await page.getByRole('button', { name: 'Add topic' }).click();
    await page.getByRole('button', { name: 'Generate mask' }).click();
    await expect.poll(() => backend.getImageRequestCount()).toBe(1);
    await expect.poll(() => backend.getUploadFileCount()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await page.getByText('Danger zone').click();
    await page.getByRole('button', { name: 'Clear current tab files' }).click();
    await page
      .getByRole('dialog', { name: 'Clear session files?' })
      .getByRole('button', { name: 'Clear files' })
      .click();

    await expect(
      page.getByText('Cleared session files. Previous files remain in saved work.'),
    ).toBeVisible();
    await page.waitForTimeout(2200);
    expect(backend.getDeleteFileCount()).toBe(0);
  });

  test('keeps destructive confirmation keyboard accessible', async ({ page }) => {
    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await page.getByText('Danger zone').click();
    await page.getByRole('button', { name: 'Clear current tab files' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear session files?' });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('keeps the workflow summary rail scrollable in a short desktop viewport', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only sidebar layout smoke.');

    await page.setViewportSize({ width: 1280, height: 520 });

    const aside = page.getByLabel('Workflow summary');
    await expect(aside).toBeVisible();

    const scrollMetrics = await aside.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: window.getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
    }));
    expect(scrollMetrics.overflowY).toBe('auto');
    expect(scrollMetrics.scrollHeight).toBeLessThanOrEqual(scrollMetrics.clientHeight + 24);
    await expect(page.getByRole('heading', { name: 'Next action' })).toBeVisible();
  });
});

test.describe('saved work workflow', () => {
  test('loads saved projects on open and refresh reloads them', async ({ page }) => {
    const backend = await mockSavedRunsBackend(page);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mask Bundle Studio' })).toBeVisible();
    await expect.poll(() => backend.getHealthRequestCount()).toBeGreaterThan(0);
    const listRunsBeforeOpen = backend.getListRunsRequestCount();

    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await expect.poll(() => backend.getListRunsRequestCount()).toBeGreaterThan(listRunsBeforeOpen);
    await expect(page.getByText('Ocean birthday masks')).toBeVisible();
    const listRunsAfterOpen = backend.getListRunsRequestCount();

    await checkSavedWorkStatus(page);
    await expect.poll(() => backend.getListRunsRequestCount()).toBeGreaterThan(listRunsAfterOpen);
    const listRunsAfterRefresh = backend.getListRunsRequestCount();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Image generation settings' })).toBeVisible();
    await page.getByRole('button', { name: 'Saved work', exact: true }).click();

    expect(backend.getListRunsRequestCount()).toBe(listRunsAfterRefresh);
  });

  test('restores an existing project draft on refresh instead of creating a duplicate run', async ({
    page,
  }) => {
    const backend = await mockRefreshDraftBackend(page);

    await page.addInitScript((project) => {
      window.localStorage.clear();
      window.localStorage.setItem('etsy-masks-admin/project-v1', JSON.stringify(project));
    }, backend.project);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByLabel('Listing title')).toHaveValue('Refresh Masks, 1 Kids Paper Mask');
    await page.waitForTimeout(2500);

    expect(backend.getDownloadFileCount()).toBe(1);
    expect(backend.getCreateRunCount()).toBe(0);
    expect(backend.getDeleteFileCount()).toBe(0);
  });

  test('shows restored images progressively before all backend files finish', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only restore timing smoke.');

    const backend = await mockProgressiveRestoreBackend(page);

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await checkSavedWorkStatus(page);
    await expect(page.getByText('Progressive masks').first()).toBeVisible();

    await page.getByRole('button', { name: 'Load project' }).click();
    await page
      .getByRole('dialog', { name: 'Load selected project?' })
      .getByRole('button', { name: 'Load project' })
      .click();
    await expect(page.getByText(/Downloading \d+\/12/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByLabel('Bundle theme')).toHaveValue('Progressive masks');
    await page.getByRole('button', { name: 'Next: topics and images' }).click();
    await expect(
      page.getByRole('button', { name: 'Open full-size color mask preview for Mask 1' }),
    ).toBeVisible();
    expect(backend.getDownloadCompletedCount()).toBeLessThan(12);
    await expect(page.getByText(/Downloading \d+\/12/).first()).toBeVisible();
    expect(backend.getDeleteFileCount()).toBe(0);
  });

  test('auto-restores saved images without deleting backend files', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only restore smoke.');

    const backend = await mockProgressiveRestoreBackend(page);

    await page.addInitScript(
      ({ project, runId }) => {
        window.localStorage.clear();
        window.localStorage.setItem('etsy-masks-admin/project-v1', JSON.stringify(project));
        window.localStorage.setItem(
          'etsy-masks-admin/active-backend-draft-run-id-by-project-v1',
          JSON.stringify({ [project.id]: runId }),
        );
      },
      { project: backend.project, runId: backend.run.id },
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByLabel('Bundle theme')).toHaveValue('Progressive masks');
    await expect.poll(() => backend.getDownloadCompletedCount(), { timeout: 12_000 }).toBe(12);
    expect(backend.getDeleteFileCount()).toBe(0);
  });

  test('expands, collapses, and deletes individual saved runs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only table interaction smoke.');

    await mockSavedRunsBackend(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await checkSavedWorkStatus(page);
    await expect(page.getByText('Ocean birthday masks')).toBeVisible();
    await expect(page.getByText('Preview', { exact: true })).toHaveCount(0);

    await page
      .getByRole('button', { name: /Ocean birthday masks/ })
      .first()
      .click();
    await expect(page.getByText('Ocean Masks, 2 Kids Paper Masks')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Restore selected run?' })).toHaveCount(0);

    await page
      .getByRole('button', { name: /Ocean birthday masks/ })
      .first()
      .click();
    await expect(page.getByText('Ocean Masks, 2 Kids Paper Masks')).toHaveCount(0);

    await page.getByRole('button', { name: 'Delete saved project Ocean birthday masks' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete saved project?' });

    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Delete project' }).click();
    await expect(page.getByText('Ocean birthday masks')).toHaveCount(0);
    await expect(page.getByText('Halloween classroom masks')).toBeVisible();
  });
});

test.describe('accessibility smoke checks', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPage(page);
  });

  test('home, saved work, and settings have no obvious axe violations', async ({ page }) => {
    await waitForUiToSettle(page);
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Saved work' })).toBeVisible();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Settings' }).click();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('destructive dialog has no obvious axe violations', async ({ page }) => {
    await page.getByRole('button', { name: 'Saved work', exact: true }).click();
    await page.getByText('Danger zone').click();
    await page.getByRole('button', { name: 'Clear current tab files' }).click();
    await waitForUiToSettle(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
