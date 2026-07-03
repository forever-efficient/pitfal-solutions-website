/**
 * Verifies password-protected client gallery auth works in WebKit (Safari engine).
 *
 * Run against production:
 *   GALLERY_ID=<id> GALLERY_PASSWORD=<pw> BASE_URL=https://www.pitfal.solutions \
 *     pnpm exec playwright test tests/e2e/client-gallery-auth.spec.ts --project=webkit
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';

const GALLERY_ID = process.env.GALLERY_ID || '';
const GALLERY_PASSWORD = process.env.GALLERY_PASSWORD || '';
const GALLERY_URL = `/client/?id=${GALLERY_ID}`;

test.skip(!GALLERY_ID || !GALLERY_PASSWORD, 'Set GALLERY_ID and GALLERY_PASSWORD env vars to run');

async function login(page: Page) {
  await page.goto(GALLERY_URL);
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', GALLERY_PASSWORD);
  await page.click('button[type="submit"]');
}

// Real image keys from the Tori gallery — used to test bulk-download auth
const TEST_IMAGE_KEYS = [
  'gallery/51e1e7af-e6cd-4db9-a7f9-c597f27f5594/1G6A0091.jpg',
  'gallery/51e1e7af-e6cd-4db9-a7f9-c597f27f5594/1G6A0093.jpg',
  'gallery/51e1e7af-e6cd-4db9-a7f9-c597f27f5594/1G6A0094.jpg',
];

test.describe('Client gallery auth — WebKit (Safari)', () => {
  test('password gate disappears and gallery loads after correct password', async ({ page }) => {
    await login(page);

    // Password gate should be gone
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    // At least one image or video element should be visible
    const mediaLocator = page.locator('img[src*="pitfal"], video, [data-testid="gallery-image"]');
    await expect(mediaLocator.first()).toBeVisible({ timeout: 15000 });
  });

  test('wrong password shows an error', async ({ page }) => {
    await page.goto(GALLERY_URL);
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', 'definitely-wrong-password-xyz');
    await page.click('button[type="submit"]');

    // Should still show the password gate (not redirect away)
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 8000 });
  });

  test('token is stored in localStorage (not just sessionStorage)', async ({ page }) => {
    await login(page);
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    const localStorageValue = await page.evaluate(() =>
      localStorage.getItem('pitfal_client_token')
    );
    expect(localStorageValue, 'pitfal_client_token must be in localStorage').toBeTruthy();
  });

  test('gallery stays accessible after page reload (localStorage persists)', async ({ page }) => {
    await login(page);
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    // Reload the page — simulates closing and reopening a tab on mobile
    await page.reload();

    // Should NOT show the password gate again
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    const mediaLocator = page.locator('img[src*="pitfal"], video, [data-testid="gallery-image"]');
    await expect(mediaLocator.first()).toBeVisible({ timeout: 15000 });
  });

  test('bulk-download API returns 200 both times (simulates mobile multi-batch)', async ({ page }) => {
    await login(page);
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    // Simulate the share-strategy loop: two sequential bulk-download API calls
    // using the same localStorage token — exactly what mobile Safari does between share batches
    const results = await page.evaluate(async ({ galleryId, imageKeys }) => {
      const token = localStorage.getItem('pitfal_client_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const call = (keys: string[]) =>
        fetch(`/api/client/${galleryId}/bulk-download`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ imageKeys: keys, size: 'full' }),
        }).then((r) => r.status);

      // Fire two calls sequentially — same as the share-batch loop
      const first = await call(imageKeys);
      const second = await call(imageKeys);
      return { first, second };
    }, { galleryId: GALLERY_ID, imageKeys: TEST_IMAGE_KEYS });

    expect(results.first, 'first bulk-download call should be 200').toBe(200);
    expect(results.second, 'second bulk-download call should be 200 (not 401)').toBe(200);
  });

  test('gallery accessible in a new tab (localStorage shared across tabs)', async ({ page, context }) => {
    await login(page);
    await expect(page.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });

    // Open the same gallery URL in a new tab in the same browser context
    const newTab = await context.newPage();
    await newTab.goto(GALLERY_URL);

    // Should NOT see the password gate — localStorage token is shared
    await expect(newTab.locator('input[type="password"]')).not.toBeVisible({ timeout: 10000 });
  });
});
