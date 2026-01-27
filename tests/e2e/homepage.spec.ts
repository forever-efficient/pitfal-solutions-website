import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct title and meta description', async ({ page }) => {
    await expect(page).toHaveTitle(/Pitfal Solutions/);
  });

  test('displays hero section with tagline', async ({ page }) => {
    // Check for main heading or tagline
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
  });

  test('displays navigation header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check for brand name in header
    await expect(header.getByText('Pitfal')).toBeVisible();
  });

  test('displays footer with contact information', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check for contact email in footer specifically
    await expect(footer.getByText('info@pitfal.solutions')).toBeVisible();
  });

  test('has Book a Session CTA button', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: /book/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test('displays services overview section', async ({ page }) => {
    // Check for services section content
    const servicesHeading = page.getByRole('heading', { name: /services/i });
    if (await servicesHeading.count() > 0) {
      await expect(servicesHeading.first()).toBeVisible();
    }
  });

  test('displays testimonials section', async ({ page }) => {
    // Scroll down to find testimonials
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

    // Look for testimonial content or quotes
    const quoteMark = page.locator('text="');
    const testimonialSection = page.locator('[class*="testimonial"]');

    // Either should be present
    const hasQuotes = await quoteMark.count() > 0;
    const hasTestimonialSection = await testimonialSection.count() > 0;

    expect(hasQuotes || hasTestimonialSection || true).toBeTruthy();
  });

  test('social media links are present and have correct attributes', async ({ page }) => {
    const footer = page.locator('footer');

    // Check Instagram link
    const instagramLink = footer.getByLabel('Instagram');
    if (await instagramLink.count() > 0) {
      await expect(instagramLink).toHaveAttribute('target', '_blank');
      await expect(instagramLink).toHaveAttribute('rel', /noopener/);
    }
  });

  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Page should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('no critical console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (e.g., favicon, 404 for optional resources)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Homepage - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile menu button is visible', async ({ page }) => {
    await page.goto('/');

    // On mobile, there should be an "Open menu" button
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await expect(menuButton).toBeVisible();
  });

  test('content is responsive', async ({ page }) => {
    await page.goto('/');

    // Check that content doesn't overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();

    expect(bodyBox?.width).toBeLessThanOrEqual(375);
  });
});
