/**
 * Playwright global setup — warms up Next.js dev server JIT compilation.
 *
 * In dev mode, the first request to each page triggers on-demand compilation
 * which can take 10–30s per route. Without warmup, individual tests timeout
 * waiting for the first compile. This setup pre-compiles all routes so tests
 * only hit already-warm pages.
 */

import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3099';

const ROUTES_TO_WARM = [
  '/',
  '/portfolio',
  '/about',
  '/services',
  '/contact',
  '/faq',
];

export default async function globalSetup() {
  const browser = await chromium.launch();

  // Desktop warmup
  const desktopPage = await browser.newPage();
  for (const route of ROUTES_TO_WARM) {
    try {
      await desktopPage.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    } catch {
      // Best-effort — if a route fails to warm, tests will still run
    }
  }
  await desktopPage.close();

  // Mobile warmup — ensures mobile viewport assets are compiled before
  // mobile tests run (Next.js dev server compiles on first request)
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 667 });
  try {
    await mobilePage.goto(`${BASE_URL}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  } catch {
    // Best-effort
  }
  await mobilePage.close();

  await browser.close();
}
