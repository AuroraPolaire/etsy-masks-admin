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

const prepareCleanPage = async (page: Page) => {
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
    await page.getByRole('button', { name: 'Next: PDFs and previews' }).click();
    await expect(page.getByRole('heading', { name: 'Create output files' })).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Image generation settings' })).toBeVisible();
    await expect(page.getByText('Session OpenAI API key')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cloud saves', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cloud saves' })).toBeVisible();
    await expect(page.getByLabel('Search saved runs')).toBeVisible();
    await expect(page.getByText('Worker API URL')).toHaveCount(0);
    await expect(page.getByText('Admin token')).toHaveCount(0);
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

test.describe('accessibility smoke checks', () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPage(page);
  });

  test('home, cloud saves, and settings have no obvious axe violations', async ({ page }) => {
    await waitForUiToSettle(page);
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole('button', { name: 'Cloud saves', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cloud saves' })).toBeVisible();
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
