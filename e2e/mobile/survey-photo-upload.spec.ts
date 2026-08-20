import { test, expect, type Page } from '@playwright/test'
import { seededTenant } from '../fixtures/tenant'
import { serviceClient } from '../../tests/integration/helpers/stack'
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// lib/storage/r2.ts is marked `server-only`, so it cannot be imported here.
// Same credentials, same bucket, built directly.
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})
const BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'

const headObject = (Key: string) =>
  r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key }))
const deleteObject = (Key: string) =>
  r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))

const DRAFT_KEY = 'hazardos-survey-draft'

// A real 1x1 PNG. The app transcodes on capture, so the bytes that reach R2 are
// the app's JPEG, not this.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Proof that a captured photo actually reaches storage.
 *
 * Everything else about photos asserts QUEUEING. That gap is how a total
 * upload failure sat in production unnoticed: `connect-src` listed no R2 host,
 * so the browser refused every presigned PUT, the queue retried three times
 * and dropped the photo. A CSP refusal is a console error rather than an
 * exception, so nothing failed loudly and no test was watching the far end.
 *
 * This one follows the whole chain: the browser uploads, the finalize endpoint
 * writes a `survey_photos` row, and the object is then confirmed present in
 * the bucket by key. If the CSP regresses, or the bucket moves, or presigning
 * breaks, this fails.
 */
test.describe('survey photo upload reaches R2', () => {
  const createdKeys: string[] = []
  const createdPhotoIds: string[] = []

  test.afterAll(async () => {
    // Leave neither the bucket nor the database dirty.
    for (const key of createdKeys) {
      await deleteObject(key).catch(() => {})
    }
    if (createdPhotoIds.length) {
      await serviceClient().from('survey_photos').delete().in('id', createdPhotoIds)
    }
  })

  const openPhotosOnAReadySurvey = async (page: Page) => {
    const tenant = seededTenant()
    await page.goto(`/site-surveys/mobile?customerId=${tenant.fixtures.customerId}`)
    await expect(page.locator('#address')).toBeVisible({ timeout: 45_000 })
    await page.getByRole('button', { name: /go to photos & videos section/i }).click()

    // Capture is refused until the survey has an id, by design.
    await expect
      .poll(
        () =>
          page.evaluate((k) => {
            try {
              return String(
                JSON.parse(localStorage.getItem(k) ?? '{}')?.state?.currentSurveyId ?? '',
              )
            } catch {
              return ''
            }
          }, DRAFT_KEY),
        { timeout: 45_000 },
      )
      .not.toBe('')

    return page.evaluate(
      (k) => String(JSON.parse(localStorage.getItem(k) ?? '{}')?.state?.currentSurveyId ?? ''),
      DRAFT_KEY,
    )
  }

  test('a captured photo lands in the bucket and is recorded', async ({ page }) => {
    const surveyId = await openPhotosOnAReadySurvey(page)

    await page
      .getByLabel('Choose a photo or video from your device')
      .first()
      .setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: PNG_1X1 })

    // The finalize endpoint only writes this row after it has itself HEADed
    // the uploaded object, so the row appearing already means the bytes
    // arrived. Polled because upload and finalize are asynchronous.
    const svc = serviceClient()
    let row: { id: string; original_r2_key: string | null } | null = null
    await expect
      .poll(
        async () => {
          const { data } = await svc
            .from('survey_photos')
            .select('id, original_r2_key')
            .eq('site_survey_id', surveyId)
            .order('created_at', { ascending: false })
            .limit(1)
          row = (data?.[0] as typeof row) ?? null
          return row?.original_r2_key ?? ''
        },
        { timeout: 60_000 },
      )
      .not.toBe('')

    const key = row!.original_r2_key!
    createdKeys.push(key)
    createdPhotoIds.push(row!.id)

    // The independent check: ask R2 directly. This is the assertion the CSP
    // bug would have failed, and the reason this spec exists.
    const head = await headObject(key)
    expect(head.ContentLength ?? 0, `object at ${key} is missing or empty`).toBeGreaterThan(0)
  })
})
