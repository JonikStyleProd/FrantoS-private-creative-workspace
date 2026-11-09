import { defineConfig, devices } from '@playwright/test';

// npm run test:e2e   (first time: npx playwright install chromium)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true, timeout: 180_000 },
});
