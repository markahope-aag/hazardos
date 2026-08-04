import { test, expect } from '@playwright/test'

/**
 * These previously logged in by hand in a beforeEach and skipped entirely unless
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD were set, so in practice they never ran.
 * They now use the shared session from fixtures/auth.setup.ts, which signs in
 * once against a freshly seeded organisation on the local stack.
 */
test.describe('Dashboard (authenticated)', () => {
  test('renders the main navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('the CRM nav item navigates to the CRM', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /crm/i }).first().click()
    await expect(page).toHaveURL(/\/crm/)
  })

  test('the site surveys page loads', async ({ page }) => {
    await page.goto('/site-surveys')
    await expect(page.getByRole('heading', { name: /site surveys/i })).toBeVisible({
      timeout: 30_000,
    })
  })
})
