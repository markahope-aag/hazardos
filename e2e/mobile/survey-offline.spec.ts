import { test, expect } from '@playwright/test'
import { seededTenant } from '../fixtures/tenant'

const DRAFT_KEY = 'hazardos-survey-draft'

/**
 * The mobile survey wizard's offline behaviour.
 *
 * This is the flow unit tests structurally cannot reach: the draft lives in a
 * Zustand store persisted to localStorage, and what matters is that a surveyor
 * halfway through a crawlspace with no signal does not lose their work. That
 * only means anything in a real browser, on a phone viewport, with the network
 * actually cut.
 *
 * Runs under the `mobile` project (Pixel 7) because the wizard is phone-first;
 * exercising it at desktop width would test markup field crews never see.
 */
test.describe('mobile survey wizard offline', () => {
  test('a part-filled draft survives a reload', async ({ page }) => {
    const tenant = seededTenant()
    const address = `77 Offline Way ${tenant.tag}`

    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })

    await page.locator('#address').fill(address)
    await page.locator('#city').fill('Denver')

    // The store writes through to localStorage; without that there is nothing
    // to resume from and the rest of this test would be meaningless.
    await expect
      .poll(async () => page.evaluate((k) => !!localStorage.getItem(k), DRAFT_KEY), {
        timeout: 15_000,
      })
      .toBe(true)

    await page.reload()
    await expect(page.locator('#address')).toHaveValue(address, { timeout: 45_000 })
  })

  test('the wizard keeps working with the network cut', async ({ page, context }) => {
    const tenant = seededTenant()
    const address = `12 No Signal Road ${tenant.tag}`

    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })

    await context.setOffline(true)
    try {
      // Typing and moving between steps is local state, so it must survive with
      // no connection at all.
      await page.locator('#address').fill(address)
      await page.getByRole('button', { name: /next/i }).click()

      // Still on the wizard, not an error page or a bounce to login.
      await expect(page).toHaveURL(/site-surveys\/mobile/)

      // The store writes through asynchronously, so poll rather than read once.
      // Reading immediately passes in isolation and fails under parallel load,
      // which is the classic shape of a test that looks flaky but is just racing.
      await expect
        .poll(async () => page.evaluate((k) => localStorage.getItem(k) ?? '', DRAFT_KEY), {
          timeout: 15_000,
        })
        .toContain('No Signal Road')
    } finally {
      await context.setOffline(false)
    }
  })

  test('CONTROL: clearing the draft leaves nothing to restore', async ({ page }) => {
    // Without this, both tests above would pass on a form that simply refilled
    // itself from the server, or from a value that was never cleared.
    const tenant = seededTenant()

    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })
    await page.locator('#address').fill(`should not survive ${tenant.tag}`)
    await expect
      .poll(async () => page.evaluate((k) => !!localStorage.getItem(k), DRAFT_KEY), {
        timeout: 15_000,
      })
      .toBe(true)

    await page.evaluate((k) => localStorage.removeItem(k), DRAFT_KEY)
    await page.reload()

    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })
    await expect(page.locator('#address')).not.toHaveValue(/should not survive/)
  })
})
