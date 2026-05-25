import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5187',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
