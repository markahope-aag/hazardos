import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

// Load .env.local so E2E_TEST_EMAIL / E2E_TEST_PASSWORD are available
config({ path: path.resolve(process.cwd(), '.env.local') })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Signs in once and seeds an organisation; everything authenticated depends
    // on it. Kept separate so a login failure reports as one clear failure
    // rather than as every spec failing for an unrelated-looking reason.
    { name: 'setup', testMatch: /fixtures\/auth\.setup\.ts/ },

    // Specs that must run signed OUT (the login form itself).
    {
      name: 'anonymous',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'chromium',
      // mobile/ is excluded on purpose: those specs belong to the phone project
      // below. Without this they run twice, and the desktop pass exercises
      // markup that field crews never see.
      testIgnore: [/auth\.spec\.ts/, /mobile\//],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },

    // The survey wizard is a phone-first flow; testing it on a desktop viewport
    // would exercise markup field crews never see.
    {
      name: 'mobile',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },

    // The same mobile specs on Safari's actual engine, not an emulation of it.
    // AHS field crews are on iPhones, and Safari differs in ways that matter:
    // it never fires `beforeinstallprompt`, so the iOS branch of the install
    // prompt cannot be exercised anywhere else. iPhone users were silently
    // getting no install offer at all until 2026-08-19 precisely because
    // nothing here ran on WebKit.
    {
      name: 'mobile-safari',
      testMatch: /mobile\/.*\.spec\.ts/,
      use: { ...devices['iPhone 14'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120000,
      }
    : undefined,
})
