import { defineConfig, devices } from '@playwright/test'

// End-to-end smoke tests.
//
// Every bug that reached production recently — budgets reading zero, a balance
// that was not a balance, a 405 on the profile route — would have been caught
// by a test that drives a real browser against a real database. The 300-odd
// unit tests could not catch any of them, because each was a seam between
// parts that were individually correct.
//
// Runs against a real Next build and a real Postgres, not mocks.
export default defineConfig({
  testDir: './e2e',
  // A smoke suite that takes ten minutes stops being run.
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Reuses a server that is already running locally; starts one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
