import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login form when unauthenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation error on empty submit', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Form validation prevents submission without email
    await expect(page.getByLabel(/email/i)).toBeFocused()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel(/email/i).fill('notauser@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 })
  })
})
