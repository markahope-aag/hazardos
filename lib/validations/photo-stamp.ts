import { z } from 'zod'

/**
 * Payload sent from the PWA to the stamp endpoint after the original
 * has finished uploading. The server uses this to:
 *   - resolve the original from storage,
 *   - prefer EXIF DateTimeOriginal but fall back to clientCapturedAt
 *     and finally to server upload time for the stamp,
 *   - compute the SHA-256 of the original,
 *   - render the burn-in stamp,
 *   - write the stamped derivative back to storage.
 *
 * GPS may come from EXIF or from the device's geolocation API at
 * capture time — either is acceptable. Omitting GPS suppresses the
 * GPS line in the stamp.
 */
export const photoStampPayloadSchema = z.object({
  /** Photo ID generated client-side. Used as the storage object name. */
  photoId: z.string().min(1).max(100),
  /** Storage path of the original (the just-uploaded forensic source). */
  originalPath: z.string().min(1).max(500),
  /** Photo category as captured (exterior, interior_overview, etc). */
  category: z.string().min(1).max(50),
  /** Optional area pin for the gallery. */
  areaId: z.string().max(100).nullable().optional(),

  /** Best-effort capture time from EXIF DateTimeOriginal/CreateDate. */
  exifCapturedAt: z.string().datetime().nullable().optional(),
  /** Time the camera shutter fired per the client device clock. Fallback when EXIF is missing. */
  clientCapturedAt: z.string().datetime().nullable().optional(),

  /** GPS coordinates — accept either EXIF or geolocation API. */
  gps: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),

  /** Camera maker + model as reported by EXIF. */
  deviceMake: z.string().max(100).nullable().optional(),
  deviceModel: z.string().max(100).nullable().optional(),

  /** MIME type of the original (image/jpeg, image/heic, etc). */
  mimeType: z.string().max(80).optional(),

  /** Server uses the org's timezone but the client may override (rare). */
  timezoneOverride: z.string().max(60).nullable().optional(),
})

export type PhotoStampPayload = z.infer<typeof photoStampPayloadSchema>

/**
 * Body for the admin restamp endpoint. Reprocesses a single photo
 * whose `stamp_status` is 'failed' (or, with `force`, 'stamped').
 */
export const restampPayloadSchema = z.object({
  surveyId: z.string().uuid(),
  photoId: z.string().min(1).max(100),
  /** Force rebuild even if status is 'stamped'. Defaults to false. */
  force: z.boolean().optional().default(false),
})

export type RestampPayload = z.infer<typeof restampPayloadSchema>
