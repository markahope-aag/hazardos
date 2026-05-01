#!/usr/bin/env node
/**
 * End-to-end test of the lifecycle (expiration) worker.
 *
 * Mirrors the logic in lib/services/photo-lifecycle.ts so we can
 * validate the full delete path without the cron HTTP wrapper. Real
 * R2 objects are created, real survey_photos rows are inserted with
 * past expires_at, then the same SELECT/DELETE/UPDATE flow runs and
 * we assert the bytes are gone and the row is soft-deleted.
 */

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
})

const checks = []
function check(label, ok, detail = '') {
  const mark = ok ? '✓' : '✗'
  checks.push({ label, ok, detail })
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ''}`)
}

const cleanup = []

async function run() {
  console.log('E2E lifecycle (expiration) test')
  console.log()

  // Setup: pick a real survey
  console.log('Setup:')
  const { data: surveyRow } = await supabase
    .from('site_surveys')
    .select('id, organization_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (!surveyRow) {
    console.error('No survey to attach to.')
    process.exit(1)
  }
  const orgId = surveyRow.organization_id
  const surveyId = surveyRow.id

  // Two test photos, both expired:
  //   • one with both an original AND a stamped key (typical case)
  //   • one with only an original (e.g. video, or stamping never ran)
  const photoA = {
    id: randomUUID(),
    legacy: `e2e-life-A-${Date.now()}`,
    originalKey: `${orgId}/originals/surveys/${surveyId}/lifecycle/lifeA-${Date.now()}.jpg`,
    stampedKey: `${orgId}/stamped/surveys/${surveyId}/lifecycle/lifeA-${Date.now()}.jpg`,
  }
  const photoB = {
    id: randomUUID(),
    legacy: `e2e-life-B-${Date.now()}`,
    originalKey: `${orgId}/videos/surveys/${surveyId}/lifecycle/lifeB-${Date.now()}.mp4`,
    stampedKey: null,
  }
  console.log(`  ✓ Photo A id ${photoA.id.slice(0, 8)}… (original + stamped)`)
  console.log(`  ✓ Photo B id ${photoB.id.slice(0, 8)}… (original only — videos)`)
  console.log()

  // Upload bytes
  console.log('R2 setup:')
  const dummy = Buffer.from('lifecycle-test-bytes')
  for (const key of [photoA.originalKey, photoA.stampedKey, photoB.originalKey]) {
    await r2.send(
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: dummy, ContentType: 'image/jpeg' }),
    )
    cleanup.push(['r2', key])
    check(`PUT ${key.split('/').pop()}`, true)
  }
  console.log()

  // Insert expired rows
  console.log('survey_photos rows (expires_at = 1 day ago):')
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString()

  for (const p of [
    {
      id: photoA.id,
      legacy_id: photoA.legacy,
      original_r2_key: photoA.originalKey,
      stamped_r2_key: photoA.stampedKey,
      media_type: 'image',
    },
    {
      id: photoB.id,
      legacy_id: photoB.legacy,
      original_r2_key: photoB.originalKey,
      stamped_r2_key: null,
      media_type: 'video',
    },
  ]) {
    cleanup.push(['row', p.id])
    const { error } = await supabase.from('survey_photos').insert({
      ...p,
      organization_id: orgId,
      site_survey_id: surveyId,
      category: 'lifecycle',
      mime_type: p.media_type === 'video' ? 'video/mp4' : 'image/jpeg',
      file_size: dummy.byteLength,
      tier: 'hot',
      tier_changed_at: new Date().toISOString(),
      expires_at: yesterday,
      stamp_status: p.stamped_r2_key ? 'stamped' : 'skipped',
    })
    check(`INSERT ${p.id.slice(0, 8)}…`, !error, error?.message ?? '')
  }
  console.log()

  // Run the same SELECT/DELETE/UPDATE flow expirePhotos() uses.
  console.log('Lifecycle pass:')
  const { data: expired } = await supabase
    .from('survey_photos')
    .select('id, original_r2_key, stamped_r2_key, original_supabase_path, stamped_supabase_path')
    .lt('expires_at', new Date().toISOString())
    .neq('tier', 'deleted')
    .in('id', [photoA.id, photoB.id])

  check(`SELECT picked up ${expired?.length ?? 0} of 2 expired rows`, (expired?.length ?? 0) === 2)

  for (const row of expired ?? []) {
    const r2Keys = [row.original_r2_key, row.stamped_r2_key].filter(Boolean)
    for (const k of r2Keys) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: k }))
      } catch (err) {
        if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) throw err
      }
    }
    await supabase
      .from('survey_photos')
      .update({
        tier: 'deleted',
        tier_changed_at: new Date().toISOString(),
        original_r2_key: null,
        stamped_r2_key: null,
        original_supabase_path: null,
        stamped_supabase_path: null,
      })
      .eq('id', row.id)
  }
  check('Bytes deleted + rows soft-deleted', true)
  console.log()

  // Verify R2 objects are gone (HEAD should 404)
  console.log('Post-lifecycle assertions:')
  for (const key of [photoA.originalKey, photoA.stampedKey, photoB.originalKey]) {
    let gone = false
    try {
      await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    } catch (err) {
      gone = err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404
    }
    check(`R2 object removed: ${key.split('/').pop()}`, gone)
  }

  // Verify rows now have tier='deleted' and null paths
  for (const id of [photoA.id, photoB.id]) {
    const { data: r } = await supabase
      .from('survey_photos')
      .select('tier, original_r2_key, stamped_r2_key')
      .eq('id', id)
      .single()
    check(
      `Row ${id.slice(0, 8)}… tier=deleted + paths nulled`,
      r?.tier === 'deleted' && !r?.original_r2_key && !r?.stamped_r2_key,
    )
  }

  // Re-running the SELECT should now return zero rows — idempotency proof
  const { data: stillExpired } = await supabase
    .from('survey_photos')
    .select('id')
    .lt('expires_at', new Date().toISOString())
    .neq('tier', 'deleted')
    .in('id', [photoA.id, photoB.id])
  check('Re-run SELECT returns 0 rows (idempotent)', (stillExpired?.length ?? 0) === 0)
}

async function tearDown() {
  console.log()
  console.log('Cleanup:')
  for (const [kind, ref] of cleanup) {
    try {
      if (kind === 'r2') {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: ref }))
      } else if (kind === 'row') {
        await supabase.from('survey_photos').delete().eq('id', ref)
      }
    } catch {}
  }
  console.log(`  ✓ ${cleanup.length} cleanup ops attempted`)
}

run()
  .then(async () => {
    await tearDown()
    console.log()
    const failed = checks.filter((c) => !c.ok)
    if (failed.length === 0) {
      console.log(`All ${checks.length} checks passed.`)
    } else {
      console.log(`${failed.length} of ${checks.length} checks FAILED.`)
      process.exit(1)
    }
  })
  .catch(async (err) => {
    console.error('Fatal:', err)
    await tearDown().catch(() => {})
    process.exit(1)
  })
