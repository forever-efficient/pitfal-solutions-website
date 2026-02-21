import { test, expect } from '@playwright/test';

test.describe('Navigation - Desktop', () => {
  // Ensure desktop viewport for these tests
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Scroll to trigger header transition from transparent → scrolled
    await page.evaluate(() => window.scrollTo(0, 50));
    // Wait for React to process the scroll event — header gains shadow-sm when
    // isScrolled=true, confirming hydration is complete and nav is interactive
    await page.locator('header.shadow-sm').waitFor({ state: 'visible' });
  });

  test('navigates to About page', async ({ page }) => {
    const nav = page.locator('nav').filter({ hasText: 'About' });
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates to Services page', async ({ page }) => {
    const nav = page.locator('nav').filter({ hasText: 'Services' });
    await nav.getByRole('link', { name: 'Services' }).click();
    await expect(page).toHaveURL(/\/services\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates to Portfolio page', async ({ page }) => {
    const nav = page.locator('nav').filter({ hasText: 'Portfolio' });
    await nav.getByRole('link', { name: 'Portfolio' }).click();
    await expect(page).toHaveURL(/\/portfolio\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates to Contact page', async ({ page }) => {
    const nav = page.locator('nav').filter({ hasText: 'Contact' });
    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/contact\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('navigates to FAQ page from footer', async ({ page }) => {
    const footer = page.locator('footer');
    const faqLink = footer.getByRole('link', { name: /faq/i });
    await faqLink.scrollIntoViewIfNeeded();
    // Wait for scroll animation to settle before clicking
    await faqLink.waitFor({ state: 'visible' });
    await faqLink.click();
    await expect(page).toHaveURL(/\/faq\/?$/);
  });

  test('logo links to homepage', async ({ page }) => {
    await page.goto('/about');
    await page.evaluate(() => window.scrollTo(0, 50));

    const header = page.locator('header');
    await header.getByRole('link', { name: /pitfal/i }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test('Book Now CTA navigates to contact', async ({ page }) => {
    const header = page.locator('header');
    await header.getByRole('link', { name: /book/i }).click();
    await expect(page).toHaveURL(/\/contact\/?$/);
  });
});

test.describe('Navigation - Portfolio Categories', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('navigates to Brands portfolio', async ({ page }) => {
    await page.goto('/portfolio');

    const main = page.locator('main');
    const brandsLink = main.getByRole('link', { name: /brand/i }).first();
    if (await brandsLink.count() > 0) {
      await brandsLink.click();
      await expect(page).toHaveURL(/portfolio\/brands/);
    }
  });

  test('navigates to Portraits portfolio', async ({ page }) => {
    await page.goto('/portfolio');

    const main = page.locator('main');
    const portraitsLink = main.getByRole('link', { name: /portrait/i }).first();
    if (await portraitsLink.count() > 0) {
      await portraitsLink.click();
      await expect(page).toHaveURL(/portfolio\/portraits/);
    }
  });

  test('navigates to Events portfolio', async ({ page }) => {
    await page.goto('/portfolio');

    const main = page.locator('main');
    const eventsLink = main.getByRole('link', { name: /event/i }).first();
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await expect(page).toHaveURL(/portfolio\/events/);
    }
  });
});

test.describe('Navigation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile menu opens and shows navigation links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const openMenuButton = page.getByRole('button', { name: 'Open menu' });
    await openMenuButton.click();

    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
  });

  test('mobile menu navigates correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open the menu
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();

    // Wait for the menu dialog to appear
    const menu = page.locator('div[role="dialog"]');
    await menu.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for animation to complete
    await page.waitForTimeout(500);

    // Wait for the About link to be ready and visible
    const aboutLink = page.getByRole('link', { name: 'About' }).first();
    await aboutLink.waitFor({ state: 'visible', timeout: 5000 });

    // Click the About link
    await aboutLink.click();

    await expect(page).toHaveURL(/\/about\/?$/);
  });
});

test.describe('Navigation - Footer Links', () => {
  test('footer service links work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const footer = page.locator('footer');
    const brandPhotoLink = footer.getByRole('link', { name: /brand photography/i });

    if (await brandPhotoLink.count() > 0) {
      await brandPhotoLink.click();
      await expect(page).toHaveURL(/services/);
    }
  });

  test('footer company links work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const footer = page.locator('footer');
    const aboutLink = footer.getByRole('link', { name: 'About' });

    await aboutLink.click();
    await expect(page).toHaveURL(/\/about\/?$/);
  });
});

test.describe('Navigation - Browser History', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('browser back button works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 50));

    const nav = page.locator('nav').filter({ hasText: 'About' });
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about\/?$/);

    // Use goBack with no-wait to avoid timeout in static builds
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
  });

  test('browser forward button works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 50));

    const nav = page.locator('nav').filter({ hasText: 'About' });
    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about\/?$/);

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);

    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/about\/?$/);
  });
});
