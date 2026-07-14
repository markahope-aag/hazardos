import { test, expect } from '@playwright/test'

// Helper: sign in with test credentials from env
async function signIn(page: import('@playwright/test').Page) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  if (!email || !password) {
    test.skip(true, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set')
    return
  }
  await page.goto('/')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/$/, { timeout: 10000 })
}

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible()
  })

  test('CRM nav item is visible and navigates', async ({ page }) => {
    await page.getByRole('link', { name: /crm/i }).first().click()
    await expect(page).toHaveURL(/\/crm/)
  })

  test('site surveys page loads', async ({ page }) => {
    await page.goto('/site-surveys')
    await expect(page.getByRole('heading', { name: /site surveys/i })).toBeVisible()
  })
})
