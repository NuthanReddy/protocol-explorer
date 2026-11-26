import { test, expect } from '@playwright/test';
import { protocols } from '../src/catalog';

const site = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173';

test('OSI filter combines with categories, toggles, and preserves lesson playback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(site);
  const layers = page.getByRole('group', { name: 'Filter by OSI layer' });
  const layer = (number: number) => layers.getByRole('button', { name: new RegExp(`^Layer ${number}:`) });
  const entries = page.locator('.protocol-entry');
  await expect(entries).toHaveCount(39);
  await expect(layers.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(layer(7)).toHaveAttribute('aria-current', 'true');
  await layer(7).focus();
  await page.keyboard.press('Enter');
  await expect(layer(7)).toHaveAttribute('aria-pressed', 'true');
  await expect(entries).toHaveCount(protocols.filter(p => p.layer === 7).length);
  await page.keyboard.press('Space');
  await expect(entries).toHaveCount(39);
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await layer(4).click();
  await expect(page.getByRole('button', { name: 'PAUSE', exact: true })).toBeVisible();
  await expect(layer(7)).toHaveAttribute('aria-current', 'true');
  await expect(layer(7)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('heading', { name: 'HTTP', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'CORE 11', exact: true }).click();
  await expect(entries).toHaveCount(protocols.filter(p => p.layer === 4 && p.category === 'Core').length);
  await layer(3).click();
  await page.getByRole('button', { name: 'APPLICATION 19', exact: true }).click();
  await expect(entries).toHaveCount(0);
  await expect(page.getByText('No protocols in this filter')).toBeVisible();
  await expect(page.locator('.catalog-filter-summary')).toContainText('Application · L3 Network');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(entries).toHaveCount(39);
  await layer(1).click();
  await expect(page.getByText('No lessons are currently classified as L1 Physical.', { exact: false })).toBeVisible();
  await layers.getByRole('button', { name: 'All', exact: true }).click();
  await expect(entries).toHaveCount(39);
});

test('global search clears incompatible filters for protocols and same-lesson stages', async ({ page }) => {
  await page.goto(site);
  const layer4 = page.getByRole('button', { name: 'Layer 4: Transport', exact: true });
  await layer4.click();
  await page.getByRole('button', { name: 'CORE 11', exact: true }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search protocols' }).fill('page rendering');
  await page.getByRole('textbox', { name: 'Search protocols' }).press('Enter');
  await expect(page.locator('.step-narration h2')).toHaveText('Page rendering');
  await expect(layer4).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.protocol-entry')).toHaveCount(39);
  await page.getByRole('button', { name: 'Layer 1: Physical', exact: true }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search protocols' }).fill('WireGuard');
  await page.getByRole('textbox', { name: 'Search protocols' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'WireGuard', exact: true })).toBeVisible();
  await expect(page.locator('.protocol-entry')).toHaveCount(39);
});

test('mobile filtering reveals results from a collapsed catalog and diagram-only mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(site);
  await expect(page.locator('.protocol-panel')).toHaveCount(0);
  const layer2 = page.getByRole('button', { name: 'Layer 2: Data Link', exact: true });
  await expect(layer2).toBeInViewport();
  await layer2.click();
  await expect(page.locator('.protocol-panel')).toBeVisible();
  await expect(page.locator('.protocol-entry')).toHaveCount(protocols.filter(p => p.layer === 2).length);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.getByRole('button', { name: 'Toggle diagram only' }).click();
  await expect(page.locator('.protocol-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Layer 3: Network', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Toggle diagram only' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.protocol-entry')).toHaveCount(protocols.filter(p => p.layer === 3).length);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('.protocol-entry')).toHaveCount(39);
});
