import { z } from 'zod'

/**
 * Validation schemas for the R2-backed photo upload pipeline.
 *
 * Two-phase upload:
 *   1. Client POSTs `/api/site-surveys/[id]/photos/upload-url` with the
 *      photo's metadata. Server returns a presigned R2 PUT URL bound
 *      to the exact key, content type, and content length we approve.
 *   2. Client PUTs the bytes directly to R2 (skips our serverless
 *      function — saves a round trip on cellular).
 *   3. Client POSTs `/api/site-surveys/[id]/photos/finalize` with the
 *      key and remaining capture metadata. Server stamps (for images),
 *      writes the stamped derivative back to R2, and inserts the
 *      survey_photos row.
 *
 * Per-content-type size caps. Originals are full-camera-resolution
 * JPEGs (typically 1–4 MB after compression). Videos go up to 250 MB
 * to match the existing Supabase bucket cap.
 */

const MAX_IMAGE_BYTES = 50 * 1024 * 1024 // 50 MB — generous for raw HEIC and large iPhone JPEGs
const MAX_VIDEO_BYTES = 250 * 1024 * 1024 // 250 MB — matches survey-photos bucket cap

const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/quicktime', // iOS .mov
  'video/webm',
  'video/x-m4v',
] as const

const photoIdSchema = z
  .string()
  .min(8)
  .max(100)
  // The client generates these via nanoid; allow the broad set of
  // characters nanoid can emit plus a few that older capture code uses.
  .regex(/^[A-Za-z0-9_-]+$/, 'photoId must be url-safe')

export const uploadUrlPayloadSchema = z
  .object({
    photoId: photoIdSchema,
    mediaType: z.enum(['image', 'video']),
    contentType: z.string().min(1).max(100),
    contentLength: z.number().int().positive(),
    category: z.string().min(1).max(60),
  })
  .superRefine((value, ctx) => {
    if (value.mediaType === 'image') {
      if (!ALLOWED_IMAGE_MIME.includes(value.contentType as typeof ALLOWED_IMAGE_MIME[number])) {
        ctx.addIssue({
          code: 'custom',
          path: ['contentType'],
          message: `Image type ${value.contentType} not allowed`,
        })
      }
      if (value.contentLength > MAX_IMAGE_BYTES) {
        ctx.addIssue({
          code: 'custom',
          path: ['contentLength'],
          message: `Image exceeds ${MAX_IMAGE_BYTES} bytes`,
        })
      }
    } else {
      if (!ALLOWED_VIDEO_MIME.includes(value.contentType as typeof ALLOWED_VIDEO_MIME[number])) {
        ctx.addIssue({
          code: 'custom',
          path: ['contentType'],
          message: `Video type ${value.contentType} not allowed`,
        })
      }
      if (value.contentLength > MAX_VIDEO_BYTES) {
        ctx.addIssue({
          code: 'custom',
          path: ['contentLength'],
          message: `Video exceeds ${MAX_VIDEO_BYTES} bytes`,
        })
      }
    }
  })

export type UploadUrlPayload = z.infer<typeof uploadUrlPayloadSchema>

export const finalizePayloadSchema = z.object({
  photoId: photoIdSchema,
  originalKey: z.string().min(1).max(1024),
  mediaType: z.enum(['image', 'video']),
  category: z.string().min(1).max(60),
  location: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  areaId: z.string().max(100).nullish(),
  mimeType: z.string().min(1).max(100).optional(),
  // Capture metadata — what the client could pull from the file before
  // canvas compression stripped EXIF. Server re-extracts as a fallback.
  exifCapturedAt: z.string().datetime().nullish(),
  clientCapturedAt: z.string().datetime().nullish(),
  gps: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullish(),
  deviceMake: z.string().max(100).nullish(),
  deviceModel: z.string().max(100).nullish(),
  /**
   * Optional explicit timezone override — used by an admin re-stamp
   * flow that's correcting historical photos captured in a different
   * zone than the operator's current org default.
   */
  timezoneOverride: z.string().max(80).nullish(),
})

export type FinalizePayload = z.infer<typeof finalizePayloadSchema>

export const r2SignedUrlsPayloadSchema = z.object({
  /**
   * R2 keys to sign. Each is validated against the caller's org by
   * the endpoint — the caller can only sign keys whose first path
   * segment is their organization_id.
   */
  keys: z.array(z.string().min(1).max(1024)).min(1).max(100),
  /**
   * If true, a `Content-Disposition: attachment` header is included
   * in the signed URL so the browser downloads instead of inlining.
   */
  forceDownload: z.boolean().optional(),
  /**
   * URL TTL in seconds. Capped at 24 hours to bound exposure if a
   * URL leaks. Defaults to 8 hours, matching the existing Supabase
   * signed URL TTL.
   */
  expiresIn: z
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24)
    .optional(),
})

export type R2SignedUrlsPayload = z.infer<typeof r2SignedUrlsPayloadSchema>

/**
 * Extension lookup for storage key construction. Mirrors the
 * normalization the legacy uploadSurveyMediaBlob applies, so the
 * forensic admin export tooling sees the same filenames it always
 * has.
 */
export function extensionForMime(mime: string, fallback: string): string {
  const raw = (mime.split('/')[1] || fallback)
    .replace('jpeg', 'jpg')
    .replace('quicktime', 'mov')
    .replace(/[^a-z0-9]/gi, '')
  return raw || fallback
}

/**
 * R2 key shape for an upload. Branched by media type so videos land
 * in their own prefix and don't get mistakenly fed to the stamp
 * pipeline by a future scheduled job.
 */
export function buildOriginalKey({
  organizationId,
  surveyId,
  category,
  photoId,
  mediaType,
  extension,
}: {
  organizationId: string
  surveyId: string
  category: string
  photoId: string
  mediaType: 'image' | 'video'
  extension: string
}): string {
  const safeCategory = category.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60)
  const prefix = mediaType === 'video' ? 'videos' : 'originals'
  return `${organizationId}/${prefix}/surveys/${surveyId}/${safeCategory}/${photoId}.${extension}`
}

/**
 * Stamped JPEG path for an image — always normalized to .jpg since
 * the stamp pipeline emits JPEG regardless of input encoding.
 */
export function buildStampedKey({
  organizationId,
  surveyId,
  category,
  photoId,
}: {
  organizationId: string
  surveyId: string
  category: string
  photoId: string
}): string {
  const safeCategory = category.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60)
  return `${organizationId}/stamped/surveys/${surveyId}/${safeCategory}/${photoId}.jpg`
}
