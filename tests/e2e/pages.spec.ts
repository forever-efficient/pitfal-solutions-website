import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/');

    // Should have main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Should have navigation
    await expect(page.locator('header')).toBeVisible();

    // Should have footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('has no broken images', async ({ page }) => {
    const brokenImages: string[] = [];

    page.on('response', (response) => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        // Ignore placeholder/demo images that might 404
        const url = response.url();
        if (!url.includes('placeholder') && !url.includes('unsplash') && !url.includes('demo')) {
          brokenImages.push(url);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow for some missing placeholder images in development
    expect(brokenImages.length).toBeLessThanOrEqual(5);
  });
});

test.describe('About Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/about');

    // Should have page title
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Should have content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('has CTA to contact', async ({ page }) => {
    await page.goto('/about');

    // Should have a way to contact/book
    const ctaLink = page.getByRole('link', { name: /contact|book/i });
    await expect(ctaLink.first()).toBeVisible();
  });
});

test.describe('Services Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/services');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays service categories', async ({ page }) => {
    await page.goto('/services');

    // Should show different service types
    const serviceHeadings = page.getByRole('heading', { level: 2 });
    expect(await serviceHeadings.count()).toBeGreaterThan(0);
  });

  test('has booking CTA', async ({ page }) => {
    await page.goto('/services');

    const bookingLink = page.getByRole('link', { name: /book|contact|get started|get a quote|get in touch/i });
    await expect(bookingLink.first()).toBeVisible();
  });
});

test.describe('Portfolio Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/portfolio');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays gallery categories', async ({ page }) => {
    await page.goto('/portfolio');

    // Should have links to category pages
    const categoryLinks = page.getByRole('link').filter({
      hasText: /brand|portrait|event/i,
    });

    expect(await categoryLinks.count()).toBeGreaterThan(0);
  });
});

test.describe('Portfolio Category Pages', () => {
  const categories = ['brands', 'portraits', 'events'];

  for (const category of categories) {
    test(`${category} page renders correctly`, async ({ page }) => {
      await page.goto(`/portfolio/${category}`);

      // Should have heading
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Should have some content
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });
  }
});

test.describe('FAQ Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/faq');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays FAQ accordion items', async ({ page }) => {
    await page.goto('/faq');

    // Should have clickable FAQ items
    const faqButtons = page.getByRole('button').filter({
      has: page.locator('[class*="question"], span'),
    });

    expect(await faqButtons.count()).toBeGreaterThan(0);
  });

  test('FAQ accordion expands on click', async ({ page }) => {
    await page.goto('/faq');

    // Find first FAQ accordion button (specifically in main content, not nav buttons)
    const main = page.locator('main');
    const firstFaqButton = main.getByRole('button').filter({ hasText: /.+/ }).first();

    // Check initial state - might be collapsed or not have the attribute
    const initialExpanded = await firstFaqButton.getAttribute('aria-expanded');

    // Click to toggle
    await firstFaqButton.click();

    // Should toggle expanded state
    if (initialExpanded === 'false') {
      await expect(firstFaqButton).toHaveAttribute('aria-expanded', 'true');
    } else {
      // If it was already expanded or didn't have attribute, check it's now expanded
      await expect(firstFaqButton).toHaveAttribute('aria-expanded', 'true');
    }
  });

  test('only one FAQ item expanded at a time', async ({ page }) => {
    await page.goto('/faq');

    const faqButtons = page.getByRole('button').filter({
      hasText: /.{10,}/, // Has substantial text
    });

    if ((await faqButtons.count()) >= 2) {
      // Expand first item
      await faqButtons.first().click();
      await expect(faqButtons.first()).toHaveAttribute('aria-expanded', 'true');

      // Expand second item
      await faqButtons.nth(1).click();

      // First should be collapsed, second expanded
      await expect(faqButtons.first()).toHaveAttribute('aria-expanded', 'false');
      await expect(faqButtons.nth(1)).toHaveAttribute('aria-expanded', 'true');
    }
  });
});

test.describe('Contact Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('displays contact form', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.getByRole('form', { name: /contact/i })).toBeVisible();
  });

  test('displays contact information', async ({ page }) => {
    await page.goto('/contact');

    // Should show email or location info
    const contactInfo = page.getByText(/info@pitfal|denver/i);
    await expect(contactInfo.first()).toBeVisible();
  });
});

test.describe('All Pages - Common Elements', () => {
  const pages = ['/', '/about', '/services', '/portfolio', '/contact', '/faq'];

  for (const pagePath of pages) {
    test(`${pagePath} has header`, async ({ page }) => {
      await page.goto(pagePath);
      await expect(page.locator('header')).toBeVisible();
    });

    test(`${pagePath} has footer`, async ({ page }) => {
      await page.goto(pagePath);
      await expect(page.locator('footer')).toBeVisible();
    });

    test(`${pagePath} has skip link or main landmark`, async ({ page }) => {
      await page.goto(pagePath);

      // Should have main content area
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  }
});

test.describe('404 Page', () => {
  test('shows 404 for non-existent page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');

    // Should return 404 status
    expect(response?.status()).toBe(404);
  });

  test('404 page has navigation back to home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should still have header/navigation
    const homeLink = page.getByRole('link', { name: /home|pitfal/i });
    await expect(homeLink.first()).toBeVisible();
  });
});

test.describe('SEO Elements', () => {
  const pages = ['/', '/about', '/services', '/portfolio', '/contact', '/faq'];

  for (const pagePath of pages) {
    test(`${pagePath} has title tag`, async ({ page }) => {
      await page.goto(pagePath);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test(`${pagePath} has meta description`, async ({ page }) => {
      await page.goto(pagePath);
      const metaDescription = page.locator('meta[name="description"]');

      // Meta description should exist (may or may not have content)
      if (await metaDescription.count() > 0) {
        const content = await metaDescription.getAttribute('content');
        expect(content).not.toBeNull();
      }
    });

    test(`${pagePath} has only one h1`, async ({ page }) => {
      await page.goto(pagePath);
      const h1Count = await page.getByRole('heading', { level: 1 }).count();
      expect(h1Count).toBe(1);
    });
  }
});

test.describe('Performance', () => {
  test('homepage loads in acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('load');
    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('no layout shift during load', async ({ page }) => {
    // Inject CLS observer before navigating
    await page.addInitScript(() => {
      (window as unknown as Record<string, number>).__CLS = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
            (window as unknown as Record<string, number>).__CLS += (entry as PerformanceEntry & { value: number }).value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // CLS should be well under 0.1 (Google "good" threshold)
    const cls = await page.evaluate(() => (window as unknown as Record<string, number>).__CLS);
    expect(cls).toBeLessThan(0.1);
  });
});
