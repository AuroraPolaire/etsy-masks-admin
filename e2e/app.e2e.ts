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

  test('drafts locally, unlocks image review, and keeps Settings key session-only', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Mask Bundle Studio' })).toBeVisible();
    await page.getByLabel('Bundle idea').fill('Moon mask for a kids birthday party');
    await page.getByRole('button', { name: 'Draft brief locally' }).click();

    await page.getByRole('button', { name: 'Next: topics' }).click();
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
    await page.getByLabel('Session OpenAI API key').fill('sk-session-only-test');
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByLabel('Session OpenAI API key')).toHaveValue('');
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

  test('home and settings have no obvious axe violations', async ({ page }) => {
    await waitForUiToSettle(page);
    let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
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
