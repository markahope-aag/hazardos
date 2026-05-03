// Configure CORS on the R2 bucket so the browser can PUT presigned
// upload URLs directly. Without this, cross-origin browser PUTs fail
// preflight and surface as "Failed to fetch" → the user sees
// "Network error during upload" on every photo.
//
// Run once per bucket; idempotent (overwrites the existing CORS config
// rather than appending to it).
//
// Usage:
//   node scripts/set-r2-cors.mjs
import fs from 'node:fs'
import path from 'node:path'
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'

function readEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  const get = (k) => {
    const m = raw.match(new RegExp(`^${k}=(.*)$`, 'm'))
    return m ? m[1].replace(/^['"]|['"]$/g, '') : null
  }
  return {
    accountId: get('R2_ACCOUNT_ID'),
    accessKeyId: get('R2_ACCESS_KEY_ID'),
    secretAccessKey: get('R2_SECRET_ACCESS_KEY'),
    bucket: get('R2_BUCKET') || 'hazardos-images',
    appUrl: get('NEXT_PUBLIC_APP_URL') || 'https://hazardos.app',
  }
}

async function main() {
  const env = readEnv()
  if (!env.accountId || !env.accessKeyId || !env.secretAccessKey) {
    console.error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local')
    process.exit(1)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    forcePathStyle: true,
  })

  // Production app origin + dev localhost + Vercel preview wildcard.
  const allowedOrigins = [
    env.appUrl,
    'http://localhost:3000',
    'https://localhost:3000',
    'https://*.vercel.app',
  ]

  const corsConfig = {
    CORSRules: [
      {
        // Browser PUT is the only operation we explicitly need cross-origin
        // since GETs go through our /api/storage/r2-signed-urls endpoint.
        // Including GET/HEAD anyway in case we ever serve directly from R2.
        AllowedMethods: ['PUT', 'GET', 'HEAD'],
        AllowedOrigins: allowedOrigins,
        AllowedHeaders: ['Content-Type', 'Content-Length', 'Authorization'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000,
      },
    ],
  }

  console.log(`Setting CORS on bucket "${env.bucket}" with origins:`)
  for (const o of allowedOrigins) console.log(`  • ${o}`)

  await client.send(
    new PutBucketCorsCommand({
      Bucket: env.bucket,
      CORSConfiguration: corsConfig,
    }),
  )

  console.log('\n✓ CORS configuration applied. Verifying...')

  const got = await client.send(new GetBucketCorsCommand({ Bucket: env.bucket }))
  console.log('Active CORS rules:')
  console.log(JSON.stringify(got.CORSRules, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
