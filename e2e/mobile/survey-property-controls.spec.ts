import { test, expect } from '@playwright/test'
import { seededTenant } from '../fixtures/tenant'

/**
 * Gina reported two things on the survey Property step, both on a phone:
 *
 *   "Property address on Survey, dropdown for WI, is not working. Won't let
 *    me choose WI."
 *   "On survey: Building type is not letting me click on one of them."
 *
 * Building Type had a real cause: the group was wrapped in a <label>, and its
 * options are <button>s, which are labelable. A label forwards every click to
 * its FIRST labelable descendant, so tapping any card selected Single-Family.
 * The test below taps the SECOND card, which is the case that was broken.
 *
 * The state dropdown is here to find out whether it is broken in the app at
 * all. WI is in the list and is the 49th of 51 entries, so it needs scrolling.
 */
test.describe('survey property controls on a phone', () => {
  test.beforeEach(async ({ page }) => {
    const tenant = seededTenant()
    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })
  })

  test('tapping a building type selects THAT one, not the first', async ({ page }) => {
    const group = page.getByRole('radiogroup').filter({ has: page.getByText('Single-Family') })
    const single = group.getByRole('radio', { name: /Single-Family/ })
    const multi = group.getByRole('radio', { name: /Multi-Family/ })

    await multi.click()

    // The whole bug: before the fix this asserted false, because the click
    // was forwarded to Single-Family regardless of where it landed.
    await expect(multi).toHaveAttribute('aria-checked', 'true')
    await expect(single).toHaveAttribute('aria-checked', 'false')
  })

  test('a third option is reachable too', async ({ page }) => {
    const group = page.getByRole('radiogroup').filter({ has: page.getByText('Single-Family') })
    const commercial = group.getByRole('radio', { name: /Commercial/ })

    await commercial.click()

    await expect(commercial).toHaveAttribute('aria-checked', 'true')
  })

  test('WI can be chosen from the state dropdown', async ({ page }) => {
    await page.getByRole('combobox').filter({ hasText: /state/i }).first().click()

    const wi = page.getByRole('option', { name: 'WI', exact: true })
    await wi.scrollIntoViewIfNeeded()
    await wi.click()

    await expect(page.locator('#state')).toContainText('WI')
  })

  // The control for the fix above. Pointer capture exists so a horizontal
  // swipe that releases over the footer still reaches the wizard, and the fix
  // delays capture rather than removing it. Without this, dropping capture
  // altogether would make the taps above pass while swipe navigation rotted.
  //
  // SKIPPED, and deliberately left in place. It cannot be driven in this
  // harness: under Chromium touch emulation page.mouse dispatches no pointer
  // events to the page at all, and CDP touch dispatch does not drive the
  // gesture either. Verified against the PRE-FIX code on 2026-08-19, where it
  // fails identically, so the capture change is not what broke it. That means
  // swipe navigation is unproven by automation in both directions, not that it
  // regressed. Left here so the gap is visible rather than assumed covered.
  // Confirm swipe on a real handset, and delete this if you make it run.
  test.skip('CONTROL: a horizontal swipe still moves to the next step', async ({ page }) => {
    const box = await page.locator('main').boundingBox()
    if (!box) throw new Error('no main content area to swipe on')

    const y = Math.round(box.y + box.height / 2)
    const startX = Math.round(box.x + box.width - 40)
    const cdp = await page.context().newCDPSession(page)

    type TouchType = 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel'
    const touch = (type: TouchType, x: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      })

    await touch('touchStart', startX)
    // Several moves: capture arms on the first one past the threshold, which
    // is the behavior under test.
    for (const step of [30, 60, 100, 150]) await touch('touchMove', startX - step)
    await touch('touchEnd', startX - 150)

    // Property gives way to Access, the next section in the wizard.
    await expect(page.getByText('Equipment Access')).toBeVisible({ timeout: 15_000 })
  })

  test('number of stories responds to the option tapped', async ({ page }) => {
    const three = page.getByRole('radio', { name: '3+', exact: true })
    await three.scrollIntoViewIfNeeded()
    await three.click()

    await expect(three).toHaveAttribute('aria-checked', 'true')
  })
})
