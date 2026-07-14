import { test, expect } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

test.describe('Dashboard (authenticated)', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL!)
    await page.getByLabel(/password/i).fill(PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    // Wait for redirect away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
  })

  test('renders dashboard after login', async ({ page }) => {
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
