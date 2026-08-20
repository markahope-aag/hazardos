import { test, expect } from '@playwright/test'

/**
 * The install offer, per engine.
 *
 * This is the case that went unnoticed for months. The banner listened only
 * for `beforeinstallprompt`, which Safari does not fire, so on iPhone and iPad
 * it was dead code while the manual told those users to install "when
 * prompted". Nothing in the suite ran on WebKit, so nothing caught it.
 *
 * These run under both mobile projects on purpose. Same spec, opposite
 * expectations, decided by the engine.
 */
test.describe('install offer on a phone', () => {
  test.beforeEach(async ({ page }) => {
    // Dismissal is remembered for seven days in localStorage, so start clean
    // or a previous run suppresses the banner and the test passes vacuously.
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('pwa-install-dismissed'))
  })

  test('iPhone gets Share, then Add to Home Screen', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-only path: no beforeinstallprompt exists here')

    await page.goto('/')

    // Apple gives the page no way to trigger an install, so the offer has to
    // be an instruction rather than a button.
    await expect(page.getByText(/Tap Share/i)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /^install$/i })).toHaveCount(0)
  })

  test('the offer can be dismissed and stays dismissed', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-only path')

    await page.goto('/')
    await expect(page.getByText(/Tap Share/i)).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: /dismiss/i }).click()
    await expect(page.getByText(/Tap Share/i)).toHaveCount(0)

    // Still gone after a reload: the seven-day suppression is what stops this
    // nagging a crew every time they open the app.
    await page.reload()
    await expect(page.getByText(/Tap Share/i)).toHaveCount(0, { timeout: 30_000 })
  })

  test('Android is not given the iOS instruction', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Chromium stands in for Android here')

    await page.goto('/')

    // Chrome decides on its own whether the app is installable, so the button
    // may or may not appear. What must never happen is an Android user being
    // told to use Safari's Share sheet.
    await expect(page.getByText(/Tap Share/i)).toHaveCount(0)
  })
})
