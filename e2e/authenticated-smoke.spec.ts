import { test, expect } from '@playwright/test'
import { seededTenant } from './fixtures/tenant'

/**
 * Proves the restored session actually works.
 *
 * An earlier version of this file asserted `not.toHaveURL(/\/login/)` after
 * visiting `/`. That passes while signed OUT, because the app renders the login
 * form at `/` without redirecting — two of four tests were green and meaningless.
 * Every assertion here now depends on authenticated data reaching the page, and
 * the last test is the control proving the page genuinely requires a session.
 */
test.describe('authenticated session', () => {
  test('the seeded contact is visible to a signed-in user', async ({ page }) => {
    // Requires the session AND a working client-side Supabase query: a fixture
    // that captured cookies but missed localStorage renders a shell and no rows.
    seededTenant()
    await page.goto('/crm/contacts')
    await expect(page.getByText('Fixture Contact').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 })
  })

  test('the session survives a hard reload', async ({ page }) => {
    await page.goto('/crm/contacts')
    await expect(page.getByText('Fixture Contact').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 })
    await page.reload()
    await expect(page.getByText('Fixture Contact').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 })
  })

  test('CONTROL: the same page redirects to login without a session', async ({ browser }) => {
    // Without this, the two tests above could pass on a page that never required
    // authentication in the first place.
    const clean = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await clean.newPage()
    await page.goto('/crm/contacts')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Fixture Contact')).toHaveCount(0)
    await clean.close()
  })
})
