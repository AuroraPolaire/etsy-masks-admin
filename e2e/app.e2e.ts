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

const mockUnavailableBackend = async (page: Page) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Backend unavailable in E2E smoke tests' }),
    });
  });
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
      model: 'gpt-image-1.5',
      size: '1024x1024',
      quality: 'medium',
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
};

const prepareCleanPage = async (page: Page) => {
  await mockUnavailableBackend(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
};

test.describe('production workflow', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPage(page);
  });

  test('starts from an empty brief, unlocks image review, and has no frontend secret fields', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Mask Bundle Studio' })).toBeVisible();
    await page.getByLabel('Listing title').fill('Moon Printable Mask, 1 Kids Paper Mask');
    await page.getByLabel('Bundle theme').fill('Moon party masks');
    await page.getByLabel('Target buyer').fill('Parents and teachers');
    await page.getByLabel('Visual style').fill('Realistic printable paper mask');
    await page
      .getByLabel('Listing description')
      .fill('Printable moon mask for parties, classrooms, and pretend play.');
    await page
      .getByLabel('Etsy tags')
      .fill('printable mask, moon mask, kids craft, party printable');
    await page
      .getByLabel('Safety note')
      .fill('Adult supervision required. Not intended for children under 3.');
    await page
      .getByLabel('Print instructions')
      .fill('Print at 100% scale on cardstock, cut, and use with supervision.');
    await page.getByLabel('Usage license').fill('Personal and classroom use only.');
    await page.getByLabel('Refund note').fill('Digital downloads are not refundable.');

    await page.getByRole('button', { name: 'Next: topics' }).click();
    await page.getByLabel('Add mask topic').fill('Moon');
    await page.getByRole('button', { name: 'Add topic' }).click();
    await expect(page.getByText('moon.png')).toBeVisible();
    await page.getByRole('button', { name: 'Next: AI images' }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'moon.png',
      mimeType: 'image/png',
      buffer: onePixelPng,
    });
    await expect(page.getByText('Review needed')).toBeVisible();
    await page.getByRole('button', { name: 'Approve Moon' }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'moon-coloring-page.png',
      mimeType: 'image/png',
      buffer: onePixelPng,
    });
    await page.getByRole('button', { name: 'Approve coloring page for Moon' }).click();
    await page.getByRole('button', { name: 'Next: QA and export' }).click();
    await expect(page.getByRole('heading', { name: 'Export package' })).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Image generation settings' })).toBeVisible();
    await expect(page.getByText('Session OpenAI API key')).toHaveCount(0);

    await page.getByRole('button', { name: 'Backend saves', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Backend saves' })).toBeVisible();
    await expect(page.getByLabel('Search saved runs')).toBeVisible();
    await expect(page.getByText('Worker API URL')).toHaveCount(0);
    await expect(page.getByText('Admin token')).toHaveCount(0);

    await page.getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByRole('heading', { name: 'Project insights' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Current project snapshot' })).toBeVisible();
    await expect(page.getByText('TODO')).toHaveCount(0);
  });

  test('keeps destructive confirmation keyboard accessible', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear session files' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear session files?' });

    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('backend saves workflow', () => {
  test('expands rows directly and deletes individual saved runs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop-only table interaction smoke.');

    await mockSavedRunsBackend(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.getByRole('button', { name: 'Backend saves', exact: true }).click();
    await expect(page.getByText('Ocean birthday masks')).toBeVisible();
    await expect(page.getByText('Preview', { exact: true })).toHaveCount(0);

    await page
      .getByRole('button', { name: /Ocean birthday masks/ })
      .first()
      .click();
    await expect(page.getByText('Ocean Masks, 2 Kids Paper Masks')).toBeVisible();

    await page.getByRole('button', { name: 'Delete saved run Ocean birthday masks' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete saved run?' });

    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Delete run' }).click();
    await expect(page.getByText('Ocean birthday masks')).toHaveCount(0);
    await expect(page.getByText('Halloween classroom masks')).toBeVisible();
  });
});

test.describe('accessibility smoke checks', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPage(page);
  });

  test('home, backend saves, insights, and settings have no obvious axe violations', async ({
    page,
  }) => {
    await waitForUiToSettle(page);
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Backend saves', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Backend saves' })).toBeVisible();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByRole('heading', { name: 'Project insights' })).toBeVisible();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Settings' }).click();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('dialog and expanded QA panel have no obvious axe violations', async ({ page }) => {
    await page.getByRole('button', { name: 'Show QA checks' }).click();
    await waitForUiToSettle(page);
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Clear session files' }).click();
    await waitForUiToSettle(page);
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });
});
