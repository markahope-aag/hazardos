#!/usr/bin/env node
/**
 * One-shot migration: copy survey photo originals from Supabase Storage
 * to Cloudflare R2 and detach the Supabase reference.
 *
 * Picks targets from the survey_photos table where:
 *   • original_supabase_path is set (the row still references Supabase
 *     bytes — these are pre-cutover rows backfilled from JSONB)
 *   • original_r2_key is NULL (the bytes haven't been migrated yet)
 *   • tier != 'deleted' (don't waste a download on rows the cron is
 *     about to expire anyway — but if it's still here it has bytes)
 *
 * For each target:
 *   1. Stream the original from the survey-photos Supabase bucket.
 *   2. PUT the bytes to R2 at the same logical key.
 *   3. UPDATE the row: set original_r2_key, null original_supabase_path.
 *   4. DELETE the Supabase object.
 *
 * The order matters — we set the R2 key BEFORE deleting from Supabase
 * so a crash mid-migration leaves the row pointing somewhere readable
 * (R2). Worst case is a duplicate copy in both backends, which the
 * gallery resolver handles fine (R2 wins).
 *
 * Resumable: re-run any time. Already-migrated rows are filtered out.
 *
 * Usage:
 *   node scripts/migrate-originals-to-r2.mjs           # 100 rows then exit
 *   node scripts/migrate-originals-to-r2.mjs --all     # loop until done
 *   node scripts/migrate-originals-to-r2.mjs --dry-run # report only
 */

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'
const SUPABASE_BUCKET = 'survey-photos'

const BATCH_SIZE = 100

const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')
const runForever = args.has('--all')

function abort(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) abort('Missing Supabase env vars')
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) abort('Missing R2 env vars')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
})

async function migrateOne(row) {
  const path = row.original_supabase_path
  // Reuse the same path as the R2 key — the prefix scheme is
  // identical (`{org}/originals/...`), so the legal export tooling
  // doesn't see filename drift.
  const r2Key = path

  const { data: blob, error: downloadErr } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .download(path)
  if (downloadErr || !blob) {
    throw new Error(`download failed: ${downloadErr?.message ?? 'no body'}`)
  }

  const buffer = Buffer.from(await blob.arrayBuffer())

  if (isDryRun) {
    return { r2Key, bytes: buffer.byteLength, dryRun: true }
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: row.mime_type ?? 'application/octet-stream',
    }),
  )

  // Detach Supabase from the row FIRST, then delete the object. If
  // the delete fails, the next run will see the row already migrated
  // (original_r2_key set, original_supabase_path null) and skip it,
  // leaving an orphan object in Supabase to be cleaned up manually.
  // That's a recoverable mess; the alternative — deleting the row's
  // only pointer to bytes that haven't yet been written elsewhere —
  // is not.
  const { error: updateErr } = await supabase
    .from('survey_photos')
    .update({
      original_r2_key: r2Key,
      original_supabase_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  if (updateErr) throw new Error(`row update failed: ${updateErr.message}`)

  try {
    await supabase.storage.from(SUPABASE_BUCKET).remove([path])
  } catch (err) {
    console.warn(`  ! delete from Supabase failed for ${path}: ${err.message}`)
  }

  return { r2Key, bytes: buffer.byteLength, dryRun: false }
}

async function fetchBatch() {
  const { data, error } = await supabase
    .from('survey_photos')
    .select('id, original_supabase_path, mime_type')
    .not('original_supabase_path', 'is', null)
    .is('original_r2_key', null)
    .neq('tier', 'deleted')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)
  if (error) throw error
  return data ?? []
}

async function run() {
  let totalMigrated = 0
  let totalFailed = 0
  let totalBytes = 0

  console.log(
    `Migrating originals Supabase → R2 (bucket: ${R2_BUCKET}${isDryRun ? ', DRY RUN' : ''})`,
  )

  while (true) {
    const batch = await fetchBatch()
    if (batch.length === 0) {
      console.log('No more rows to migrate.')
      break
    }

    console.log(`Batch: ${batch.length} row(s)`)
    for (const row of batch) {
      try {
        const r = await migrateOne(row)
        totalMigrated += 1
        totalBytes += r.bytes
        const sizeKb = (r.bytes / 1024).toFixed(1)
        console.log(`  ✓ ${row.id} (${sizeKb} KB)${r.dryRun ? ' [dry-run]' : ''}`)
      } catch (err) {
        totalFailed += 1
        console.error(`  ✗ ${row.id}: ${err.message}`)
      }
    }

    if (!runForever) break
  }

  console.log()
  console.log(`Migrated: ${totalMigrated}`)
  console.log(`Failed:   ${totalFailed}`)
  console.log(`Bytes:    ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`)

  if (totalFailed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
