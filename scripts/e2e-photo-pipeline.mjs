#!/usr/bin/env node
/**
 * End-to-end test of the R2 photo pipeline.
 *
 * Exercises the real plumbing: R2 PUT → server-side sharp stamp →
 * R2 PUT (stamped) → survey_photos INSERT → signed-URL fetch (both
 * prefixes) → cleanup. No HTTP routes are hit — those need a cookie
 * session and are tested via the browser; this confirms every layer
 * underneath them works against the actual dev infrastructure.
 *
 * Self-cleaning: the row is hard-deleted and both R2 objects removed
 * at the end (or in the catch). Safe to re-run.
 */

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()

import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { createHash, randomUUID } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing env vars (need Supabase service key + all four R2 vars).')
  process.exit(1)
}

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
  console.log('E2E photo pipeline test')
  console.log()

  // ─── 1. Pick a real survey + org from the DB ────────────────────────
  console.log('Setup:')
  const { data: surveyRow, error: surveyErr } = await supabase
    .from('site_surveys')
    .select('id, organization_id, customer_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (surveyErr || !surveyRow) {
    console.error('Could not find a survey to attach the test photo to.')
    process.exit(1)
  }

  const orgId = surveyRow.organization_id
  const surveyId = surveyRow.id
  const photoId = `e2e-${Date.now()}`
  const category = 'overview'
  const originalKey = `${orgId}/originals/surveys/${surveyId}/${category}/${photoId}.jpg`
  const stampedKey = `${orgId}/stamped/surveys/${surveyId}/${category}/${photoId}.jpg`

  console.log(`  ✓ Using org ${orgId.slice(0, 8)}…, survey ${surveyId.slice(0, 8)}…`)
  console.log(`  ✓ Test photoId: ${photoId}`)
  console.log()

  // ─── 2. Generate a test JPEG ─────────────────────────────────────────
  console.log('Source image:')
  const sourceBuffer = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 80, g: 110, b: 140 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer()
  check('Generated 1600×1200 source JPEG', true, `${sourceBuffer.byteLength} bytes`)

  const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex')
  check('SHA-256 fingerprint computed', true, sourceHash.slice(0, 16) + '…')
  console.log()

  // ─── 3. PUT original to R2 ───────────────────────────────────────────
  console.log('R2 originals/ prefix:')
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: originalKey,
      Body: sourceBuffer,
      ContentType: 'image/jpeg',
    }),
  )
  cleanup.push(['r2', originalKey])
  check('PUT original', true, originalKey)

  const headOriginal = await r2.send(
    new HeadObjectCommand({ Bucket: R2_BUCKET, Key: originalKey }),
  )
  check(
    'HEAD original confirms upload',
    headOriginal.ContentLength === sourceBuffer.byteLength,
    `${headOriginal.ContentLength} bytes`,
  )
  console.log()

  // ─── 4. Round-trip via sharp stamp (mirrors photo-stamper.ts) ───────
  console.log('Stamp pipeline:')
  const dl = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: originalKey }))
  const dlChunks = []
  for await (const chunk of dl.Body) dlChunks.push(chunk)
  const downloaded = Buffer.concat(dlChunks)
  check('GET original', downloaded.byteLength === sourceBuffer.byteLength)

  const dlHash = createHash('sha256').update(downloaded).digest('hex')
  check('Round-trip hash matches', dlHash === sourceHash)

  const stampedBuffer = await stampImage(downloaded, {
    capturedAt: new Date(),
    jobNumber: `S${surveyId.slice(0, 8)}`,
    techName: 'E. 2etest',
    timezone: 'America/Chicago',
  })
  check('sharp stamped JPEG', stampedBuffer.byteLength > 0, `${stampedBuffer.byteLength} bytes`)
  console.log()

  // ─── 5. PUT stamped to R2 ────────────────────────────────────────────
  console.log('R2 stamped/ prefix:')
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: stampedKey,
      Body: stampedBuffer,
      ContentType: 'image/jpeg',
    }),
  )
  cleanup.push(['r2', stampedKey])
  check('PUT stamped', true, stampedKey)
  console.log()

  // ─── 6. INSERT survey_photos row ─────────────────────────────────────
  console.log('survey_photos:')
  const { data: org } = await supabase
    .from('organizations')
    .select('photo_retention_days')
    .eq('id', orgId)
    .single()
  const retentionDays = org?.photo_retention_days ?? 1095

  const insertId = randomUUID()
  cleanup.push(['row', insertId])
  const { data: row, error: insertErr } = await supabase
    .from('survey_photos')
    .insert({
      id: insertId,
      organization_id: orgId,
      site_survey_id: surveyId,
      customer_id: surveyRow.customer_id,
      legacy_id: photoId,
      category,
      caption: 'E2E pipeline test artifact',
      captured_at: new Date().toISOString(),
      captured_at_source: 'server',
      media_type: 'image',
      mime_type: 'image/jpeg',
      file_size: sourceBuffer.byteLength,
      file_hash: sourceHash,
      original_r2_key: originalKey,
      stamped_r2_key: stampedKey,
      tier: 'hot',
      tier_changed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + retentionDays * 86400 * 1000).toISOString(),
      stamp_status: 'stamped',
    })
    .select()
    .single()

  if (insertErr) {
    check('INSERT survey_photos', false, insertErr.message)
    throw insertErr
  }
  check('INSERT survey_photos', true, `id ${row.id.slice(0, 8)}…`)

  // SELECT back to confirm RLS-bypassed read works and data round-trips.
  const { data: readback } = await supabase
    .from('survey_photos')
    .select('id, original_r2_key, stamped_r2_key, file_hash, tier, expires_at, captured_at_source')
    .eq('id', insertId)
    .single()

  check('SELECT readback original_r2_key', readback?.original_r2_key === originalKey)
  check('SELECT readback stamped_r2_key', readback?.stamped_r2_key === stampedKey)
  check('SELECT readback file_hash', readback?.file_hash === sourceHash)
  check('SELECT readback tier=hot', readback?.tier === 'hot')

  const expiryDays = Math.round(
    (new Date(readback.expires_at).getTime() - Date.now()) / (86400 * 1000),
  )
  check('expires_at ≈ retention window', expiryDays >= retentionDays - 1, `${expiryDays} days out`)
  console.log()

  // ─── 7. Signed URL fetch for both prefixes ───────────────────────────
  console.log('Signed URL fetches:')
  const stampedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: stampedKey }),
    { expiresIn: 300 },
  )
  const stampedFetch = await fetch(stampedUrl)
  check(
    'GET stamped via signed URL',
    stampedFetch.ok && stampedFetch.headers.get('content-type')?.includes('image/jpeg'),
    `HTTP ${stampedFetch.status} ${stampedFetch.headers.get('content-type')}`,
  )

  const originalUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: originalKey }),
    { expiresIn: 300 },
  )
  const originalFetch = await fetch(originalUrl)
  check(
    'GET original via signed URL',
    originalFetch.ok && originalFetch.headers.get('content-type')?.includes('image/jpeg'),
    `HTTP ${originalFetch.status} ${originalFetch.headers.get('content-type')}`,
  )

  const fetchedStamped = Buffer.from(await stampedFetch.arrayBuffer())
  check(
    'Stamped bytes match what we PUT',
    Buffer.compare(fetchedStamped, stampedBuffer) === 0,
    `${fetchedStamped.byteLength} bytes`,
  )
  console.log()

  // ─── 8. Cool-down + retention math sanity ───────────────────────────
  console.log('Lifecycle math:')
  const ageDays = (Date.now() - new Date(row.created_at).getTime()) / (86400 * 1000)
  check('row age < 180 days (visible to all)', ageDays < 180, `${ageDays.toFixed(4)} days`)
  check(
    'row not expired (expires_at > now)',
    new Date(row.expires_at) > new Date(),
    `${new Date(row.expires_at).toISOString().slice(0, 10)}`,
  )
}

/**
 * Mirrors the bottom-left stamp band the real photo-stamper.ts emits.
 * Simplified: just drops a yellow-on-black "E2E TEST" overlay so we
 * can verify sharp's composite + jpeg encode work end-to-end in this
 * Node context with the same library version the server uses.
 */
async function stampImage(buffer, meta) {
  const pipeline = sharp(buffer).rotate()
  const { width, height } = await pipeline.metadata()
  const fontSize = Math.max(16, Math.round(width / 60))
  const padding = Math.round(fontSize * 0.6)
  const lineHeight = Math.round(fontSize * 1.4)
  const lines = [
    new Date(meta.capturedAt).toISOString().replace('T', ' ').slice(0, 19),
    `Job ${meta.jobNumber} · ${meta.techName}`,
  ]
  const boxHeight = lines.length * lineHeight + padding
  const boxY = height - boxHeight - padding
  const boxX = padding
  const boxWidth = Math.min(width - padding * 2, Math.round(width * 0.85))

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>.s{font-family:'Courier New',monospace;font-size:${fontSize}px;font-weight:bold;fill:#FFEB3B;stroke:#000;stroke-width:${(fontSize / 12).toFixed(2)};paint-order:stroke fill}</style>
    <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" fill="rgba(0,0,0,0.55)" rx="4"/>
    ${lines.map((l, i) => `<text x="${boxX + padding}" y="${boxY + padding / 2 + (i + 1) * lineHeight - Math.round(fontSize * 0.3)}" class="s">${l}</text>`).join('')}
  </svg>`

  return pipeline
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
}

async function tearDown() {
  console.log()
  console.log('Cleanup:')
  for (const [kind, ref] of cleanup) {
    try {
      if (kind === 'r2') {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: ref }))
        console.log(`  ✓ R2 ${ref.slice(-50)}`)
      } else if (kind === 'row') {
        await supabase.from('survey_photos').delete().eq('id', ref)
        console.log(`  ✓ row ${ref.slice(0, 8)}…`)
      }
    } catch (err) {
      console.log(`  ! cleanup of ${kind}:${ref} failed: ${err.message}`)
    }
  }
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
