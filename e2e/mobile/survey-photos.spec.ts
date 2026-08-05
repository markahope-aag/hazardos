import { test, expect, type Page } from '@playwright/test'
import { seededTenant } from '../fixtures/tenant'

const QUEUE_KEY = 'hazardos-photo-upload-queue'
const BLOB_DB = 'hazardos-photo-blobs'

// A real 1x1 PNG. Deliberately tiny: the app transcodes on capture and the queue
// keeps image data out of localStorage, so a large fixture would be testing the
// browser's storage limits rather than the application.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Photo capture while offline: the riskiest field path in the product. A
 * surveyor photographs a crawlspace with no signal, and that work has to survive
 * until the phone finds a network.
 *
 * The upload targets R2, which is not configured locally, so these assert the
 * part that is both testable and load-bearing — that a capture is QUEUED, that
 * the queue survives a reload, and that image data stays out of localStorage —
 * rather than pretending an upload happened.
 *
 * The design these lock in: queue metadata (id, category, fileSize, fileType)
 * lives in localStorage with `localUri` emptied, and the blobs live in
 * IndexedDB. That split is what stops a few full-size photos blowing the 5-10 MB
 * localStorage quota and silently losing the entire queue.
 */
test.describe('mobile survey photos offline', () => {
  // The photos step renders one capture control per category group, so the
  // library input appears five times; the first belongs to the first category.
  const openPhotos = async (page: Page) => {
    const tenant = seededTenant()
    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })
    await page.getByRole('button', { name: /go to photos & videos section/i }).click()
  }

  // The progress dots render on every step. #address only exists on the property
  // step, so using it after a reload fails once the wizard restores to photos.
  const wizardReady = (page: Page) =>
    expect(page.getByRole('button', { name: /go to property section/i })).toBeVisible({
      timeout: 45_000,
    })

  // Going back online kicks off upload retries, and the app's own navigation can
  // supersede a reload issued at the same moment ("net::ERR_ABORTED; maybe frame
  // was detached"). Retrying once is deterministic; a fixed sleep would not be.
  const reloadStable = async (page: Page) => {
    try {
      await page.reload()
    } catch {
      await page.goto(page.url())
    }
    await wizardReady(page)
  }

  const capture = async (page: Page, name: string) =>
    page
      .getByLabel('Choose a photo or video from your device')
      .first()
      .setInputFiles({ name, mimeType: 'image/png', buffer: PNG_1X1 })

  const queueLength = (page: Page) =>
    page.evaluate((k) => {
      try {
        return JSON.parse(localStorage.getItem(k) ?? '{}')?.state?.queue?.length ?? 0
      } catch {
        return 0
      }
    }, QUEUE_KEY)

  test('a photo captured offline is queued and survives a reload', async ({ page, context }) => {
    await openPhotos(page)
    await page.evaluate((k) => localStorage.removeItem(k), QUEUE_KEY)

    await context.setOffline(true)
    try {
      await capture(page, 'crawlspace.png')
      // Queued with no network at all.
      await expect.poll(() => queueLength(page), { timeout: 25_000 }).toBeGreaterThan(0)
    } finally {
      await context.setOffline(false)
    }

    // An in-memory-only queue loses the photo the moment the tab is evicted or
    // the phone is locked, which is exactly when this matters.
    await reloadStable(page)
    await expect.poll(() => queueLength(page), { timeout: 25_000 }).toBeGreaterThan(0)
  })

  test('image data stays out of localStorage and the blob goes to IndexedDB', async ({
    page,
    context,
  }) => {
    await openPhotos(page)
    await page.evaluate((k) => localStorage.removeItem(k), QUEUE_KEY)

    // Both stores are read while STILL OFFLINE. Coming back online kicks off
    // upload retries that can navigate the page out from under an evaluate,
    // which surfaces as "Execution context was destroyed".
    let persisted = ''
    let databases: string[] = []
    await context.setOffline(true)
    try {
      await capture(page, 'quota.png')
      await expect.poll(() => queueLength(page), { timeout: 25_000 }).toBeGreaterThan(0)

      persisted = await page.evaluate((k) => localStorage.getItem(k) ?? '', QUEUE_KEY)
      // The blob has to land somewhere durable, or "queued" means metadata
      // pointing at an image that no longer exists.
      databases = await page.evaluate(() =>
        indexedDB.databases().then((dbs) => dbs.map((d) => d.name ?? '')),
      )
    } finally {
      await context.setOffline(false)
    }
    // If a refactor ever drops the partialize, a handful of real photos exceed
    // the quota and the whole queue fails to persist, losing the work this is
    // meant to protect.
    expect(persisted, 'base64 image data reached localStorage').not.toMatch(
      /data:image\/[a-z]+;base64,/,
    )
    const entry = JSON.parse(persisted).state.queue[0]
    expect(entry.localUri, 'localUri should be emptied before persisting').toBe('')
    expect(entry.fileSize, 'queue entry should still describe the file').toBeGreaterThan(0)

    expect(databases, 'blob store missing').toContain(BLOB_DB)
  })

  test('CONTROL: with nothing captured the queue stays empty', async ({ page }) => {
    // Without this, the assertions above could pass on a queue left populated by
    // an earlier test or a previous run.
    await openPhotos(page)
    await page.evaluate((k) => localStorage.removeItem(k), QUEUE_KEY)
    await reloadStable(page)
    expect(await queueLength(page)).toBe(0)
  })
})
