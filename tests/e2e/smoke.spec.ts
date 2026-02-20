import { test, expect } from '@playwright/test';

test.describe('Smoke Suite - Core Paths', () => {
    test('Homepage loads correctly', async ({ page }) => {
        const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);

        // Title and Meta
        await expect(page).toHaveTitle(/Pitfal Solutions/);

        // Structural elements
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();

        // Critical content
        await expect(page.locator('section').first()).toBeVisible();
        await expect(page.getByRole('heading', { name: /services/i }).first()).toBeVisible();
    });

    test('Portfolio category routing works', async ({ page }) => {
        await page.goto('/portfolio');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        // Navigate to a subcategory
        const brandsLink = page.locator('main a').filter({ hasText: /brand/i }).first();
        if (await brandsLink.count() > 0) {
            await brandsLink.click();
            await expect(page).toHaveURL(/portfolio\/brands/);
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        }
    });

    test('Services page loads and shows CTA', async ({ page }) => {
        await page.goto('/services');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const bookingLink = page.getByRole('link', { name: /book|contact/i }).first();
        await expect(bookingLink).toBeVisible();
    });

    test('404 properly handled', async ({ page }) => {
        const response = await page.goto('/this-page-does-not-exist-12345');
        expect(response?.status()).toBe(404);

        // Header navigation still survives 404
        await expect(page.getByRole('link', { name: /home|pitfal/i }).first()).toBeVisible();
    });

    test('Mobile responsive container works', async ({ page }) => {
        // Test small viewport just for layout bounds
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(375);

        // Mobile menu trigger exists
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    });
});
