import 'server-only'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Cloudflare R2 client.
 *
 * R2 is S3-compatible, so we use the AWS SDK pointed at R2's endpoint.
 * Picked over native S3 + Glacier IR because R2 has zero egress fees —
 * a big deal once stamped photos are served on every survey-detail
 * gallery render and every legal export.
 *
 * Auth: account-scoped access key + secret. Generate at
 * https://dash.cloudflare.com → R2 → Manage R2 API Tokens.
 *
 * Region is fixed to 'auto' for R2; the `forcePathStyle` flag is
 * required because R2 does not support virtual-hosted-style URLs.
 */

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET ?? 'hazardos-images'

let cachedClient: S3Client | null = null

function getClient(): S3Client {
  if (cachedClient) return cachedClient

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'and R2_SECRET_ACCESS_KEY in the environment.',
    )
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  })
  return cachedClient
}

/** Whether the R2 client has the env vars it needs to operate. */
export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY)
}

/** Bucket name in use, surfaced so callers can log it. */
export function getR2Bucket(): string {
  return R2_BUCKET
}

/**
 * Generate a presigned PUT URL the browser can use to upload directly
 * to R2 without routing the bytes through our serverless functions.
 * The URL is bound to the exact key, content type, and (optional)
 * content-length range we issue here, so a malicious client can't
 * reuse it to write somewhere else or oversize the upload.
 */
export async function presignUpload({
  key,
  contentType,
  contentLengthMin,
  contentLengthMax,
  expiresIn = 600,
}: {
  key: string
  contentType: string
  contentLengthMin?: number
  contentLengthMax?: number
  expiresIn?: number
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLengthMax,
  })

  const url = await getSignedUrl(getClient(), command, {
    expiresIn,
    unhoistableHeaders: contentLengthMin ? new Set(['content-length']) : undefined,
  })
  return url
}

/**
 * Generate a presigned GET URL for downloading or rendering a stored
 * object. Default TTL of 8 hours mirrors the Supabase Storage signed
 * URL TTL we use elsewhere — long enough for a survey-detail session
 * without burning through the signing service on every render.
 */
export async function presignDownload({
  key,
  expiresIn = 60 * 60 * 8,
  filename,
}: {
  key: string
  expiresIn?: number
  /** Set to force the browser into a download with this filename. */
  filename?: string
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ResponseContentDisposition: filename
      ? `attachment; filename="${filename.replace(/"/g, '')}"`
      : undefined,
  })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/**
 * HEAD an object — used to confirm an upload completed before we
 * insert the survey_photos row, and by the lifecycle worker to verify
 * a tier-flip target exists.
 */
export async function headObject(key: string): Promise<{
  contentLength: number | null
  contentType: string | null
  etag: string | null
} | null> {
  try {
    const out = await getClient().send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    )
    return {
      contentLength: out.ContentLength ?? null,
      contentType: out.ContentType ?? null,
      etag: out.ETag ?? null,
    }
  } catch (err) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw err
  }
}

/** Upload a buffer directly from server code (used by the stamp pipeline). */
export async function putObject({
  key,
  body,
  contentType,
}: {
  key: string
  body: Buffer | Uint8Array
  contentType: string
}): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/**
 * Download an object body to a Buffer. Used by the stamp pipeline to
 * pull the original out of R2 for processing.
 */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const out: GetObjectCommandOutput = await getClient().send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  )
  if (!out.Body) {
    throw new Error(`R2 object ${key} has no body`)
  }
  const chunks: Uint8Array[] = []
  // The SDK returns a web ReadableStream in Node 20+; iterate it.
  const stream = out.Body as unknown as AsyncIterable<Uint8Array>
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** Delete a single object. Tier='deleted' transition + admin retention. */
export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }),
  )
}
