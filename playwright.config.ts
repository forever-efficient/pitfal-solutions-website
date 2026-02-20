import { defineConfig, devices } from '@playwright/test';
const os = require('os');
const maxWorkers = Math.min(Math.max(1, Math.floor(os.cpus().length / 2)), 4);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : maxWorkers,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3098',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  // Just run Chromium by default for speed. CI or explicit commands can enable the matrix.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Run against the production build for reliable E2E tests without compiling on-the-fly
    // Static export means we must use a static server rather than 'next start'
    command: 'pnpm run build && npx serve@latest out -p 3098',
    url: 'http://localhost:3098',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
