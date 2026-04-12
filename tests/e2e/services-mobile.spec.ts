import { test, expect, devices } from '@playwright/test';

// Regression guard for the services page mobile overflow fix.
//
// Root cause: RecentWorkCarousel / VideoCarousel render strips with
// `width: max-content`. CSS grid items default to `min-width: auto`,
// so without `min-w-0` on the card Link wrapper the grid cell stretched
// to ~10000px and pushed the card off-screen on mobile.
//
// This test asserts every service card's bounding box stays within the
// mobile viewport. Removing `min-w-0` from src/app/services/page.tsx
// will fail this test.

test.use({ ...devices['iPhone 13 Mini'] });

test('services page cards do not overflow the mobile viewport', async ({ page }) => {
  await page.goto('/services');
  await expect(
    page.getByRole('heading', { level: 1, name: /Full Service Offerings/i })
  ).toBeVisible();

  const viewportWidth = page.viewportSize()!.width;

  // Service cards are rendered as <Link href="/services/..."> inside the grid.
  const cards = page.locator('main a[href^="/services/"]');
  const count = await cards.count();
  expect(count, 'expected at least one service card to render').toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const href = await card.getAttribute('href');
    const box = await card.boundingBox();
    expect(box, `card ${i} (${href}) should have a bounding box`).not.toBeNull();

    // +1 to tolerate subpixel rounding in the layout engine.
    expect(
      box!.x,
      `card ${i} (${href}) should not start left of the viewport`
    ).toBeGreaterThanOrEqual(0);
    expect(
      box!.x + box!.width,
      `card ${i} (${href}) right edge (${box!.x + box!.width}) should not exceed viewport width (${viewportWidth})`
    ).toBeLessThanOrEqual(viewportWidth + 1);
  }
});
