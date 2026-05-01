#!/usr/bin/env node
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv() // also load .env if present, without overriding .env.local

import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'

function check(label, ok, detail = '') {
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

console.log('Checking R2 connectivity for bucket:', BUCKET)
console.log()

console.log('Env vars:')
check('R2_ACCOUNT_ID set', Boolean(ACCOUNT_ID))
check('R2_ACCESS_KEY_ID set', Boolean(ACCESS_KEY_ID))
check('R2_SECRET_ACCESS_KEY set', Boolean(SECRET_ACCESS_KEY))
check('R2_BUCKET set', Boolean(process.env.R2_BUCKET), `using ${BUCKET}`)
console.log()

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('Missing required env vars — aborting.')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  forcePathStyle: true,
})

console.log('R2 operations:')

// 1. Bucket reachable?
try {
  await client.send(new HeadBucketCommand({ Bucket: BUCKET }))
  check('HEAD bucket', true)
} catch (err) {
  check('HEAD bucket', false, err.name + ': ' + (err.message ?? 'unknown'))
  process.exit(1)
}

// 2. Write a tiny object.
const testKey = `_health/check-${Date.now()}.txt`
const testBody = 'r2-connectivity-check'
try {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: testKey,
      Body: testBody,
      ContentType: 'text/plain',
    }),
  )
  check('PUT object', true, testKey)
} catch (err) {
  check('PUT object', false, err.name + ': ' + (err.message ?? 'unknown'))
  process.exit(1)
}

// 3. Read it back.
try {
  const out = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: testKey }))
  const body = await out.Body.transformToString()
  check('GET object', body === testBody, body === testBody ? '' : `got ${JSON.stringify(body)}`)
} catch (err) {
  check('GET object', false, err.name + ': ' + (err.message ?? 'unknown'))
}

// 4. List under the prefix (sanity that LIST works for the lifecycle worker).
try {
  const out = await client.send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: '_health/', MaxKeys: 5 }),
  )
  check('LIST objects', true, `${out.KeyCount ?? 0} key(s) under _health/`)
} catch (err) {
  check('LIST objects', false, err.name + ': ' + (err.message ?? 'unknown'))
}

// 5. Clean up.
try {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testKey }))
  check('DELETE object', true)
} catch (err) {
  check('DELETE object', false, err.name + ': ' + (err.message ?? 'unknown'))
}

console.log()
if (process.exitCode === 1) {
  console.log('R2 connectivity FAILED.')
} else {
  console.log('R2 connectivity OK.')
}
