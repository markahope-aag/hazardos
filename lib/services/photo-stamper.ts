import 'server-only'
import sharp from 'sharp'
import exifr from 'exifr'
import { createHash } from 'crypto'

/**
 * Server-side photo forensic pipeline.
 *
 * Two artifacts are produced from every uploaded photo:
 *   1. ORIGINAL — bytes exactly as received, hash-fingerprinted, stored
 *      in the admin-only `originals/` prefix for legal export.
 *   2. STAMPED — JPEG with a yellow-on-black timestamp + job + GPS band
 *      burned into pixels at the bottom-left, what the app and reports
 *      display.
 *
 * Stamping must never block ingest: if sharp throws, the original is
 * still safe and the row is marked `stamp_status='failed'` for the
 * admin retry endpoint to pick up later.
 */

export interface StampMetadata {
  /** Used as the first stamp line. */
  capturedAt: Date
  /** Job number printed on the second line. Use 'Survey ID' if no job exists yet. */
  jobNumber: string
  /** Technician name printed on the second line. Falls back to 'Unknown Operator'. */
  techName: string
  /** GPS coordinates. Null suppresses the GPS line entirely. */
  gps: { lat: number; lng: number } | null
  /** IANA timezone for rendering capturedAt (e.g., 'America/Chicago'). */
  timezone: string
}

export interface ExtractedExif {
  capturedAt: Date | null
  gps: { lat: number; lng: number } | null
  deviceMake: string | null
  deviceModel: string | null
  /** Subset we keep for the legal trail. */
  raw: Record<string, unknown>
}

const STAMP_TEXT_COLOR = '#FFEB3B' // sodium-vapor yellow — readable against drywall and dark crawlspaces alike
const STAMP_BG = 'rgba(0,0,0,0.55)'
// Cap input pixels — pro phones now hit 50+ MP. Sharp's default limit is
// already permissive, but explicit beats implicit when the input could
// be hostile.
const SHARP_PIXEL_LIMIT = 100_000_000 // ~100 MP
// If a photo arrives larger than this on its longest side, downsample
// for the stamped derivative — originals retain full res. Keeps stamped
// JPEGs under a few MB and avoids font-too-small-to-read issues.
const STAMPED_MAX_DIMENSION = 4000

/**
 * Compute SHA-256 hex digest of the input. Used as the bytes-level
 * fingerprint of the original that gets stored alongside the photo
 * metadata; defense attorneys can re-run `shasum -a 256` against the
 * exported original and match the value in the audit log.
 */
export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Pull the EXIF subset we care about. Failures degrade gracefully —
 * screenshots, downloaded images, and stripped JPEGs all return
 * `{capturedAt: null, gps: null, ...}` instead of throwing.
 */
export async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  try {
    const exif = await exifr.parse(buffer, {
      gps: true,
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'OffsetTimeOriginal',
        'Make',
        'Model',
        'Software',
        'Orientation',
        'latitude',
        'longitude',
        'GPSAltitude',
      ],
    })
    if (!exif) {
      return { capturedAt: null, gps: null, deviceMake: null, deviceModel: null, raw: {} }
    }

    const capturedAt: Date | null =
      (exif.DateTimeOriginal instanceof Date && exif.DateTimeOriginal) ||
      (exif.CreateDate instanceof Date && exif.CreateDate) ||
      null

    const gps =
      typeof exif.latitude === 'number' && typeof exif.longitude === 'number'
        ? { lat: exif.latitude, lng: exif.longitude }
        : null

    return {
      capturedAt,
      gps,
      deviceMake: typeof exif.Make === 'string' ? exif.Make : null,
      deviceModel: typeof exif.Model === 'string' ? exif.Model : null,
      raw: exif as Record<string, unknown>,
    }
  } catch {
    return { capturedAt: null, gps: null, deviceMake: null, deviceModel: null, raw: {} }
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return c
    }
  })
}

function formatStampDate(date: Date, timezone: string): string {
  // YYYY-MM-DD HH:MM:SS TZ — readable, sortable, includes zone for
  // unambiguous interpretation when a job crosses zone boundaries.
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
      hour12: false,
    })
    // en-CA gives us YYYY-MM-DD ordering naturally; the locale produces
    // "2026-04-30, 14:35:22 CDT" — replace the comma with a space for
    // a tighter render in the stamp band.
    return formatter.format(date).replace(',', '')
  } catch {
    // Bad timezone string — fall back to UTC ISO. Rare; an org with a
    // mistyped TZ shouldn't blow up the upload pipeline.
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }
}

/**
 * Burn a forensic stamp into the bottom-left of the image.
 *
 * CRITICAL: `sharp().rotate()` is called BEFORE composite so that
 * iPhone landscape shots (which carry an EXIF orientation flag rather
 * than physically rotated pixels) get the stamp on the correct edge of
 * the displayed image. Without this, landscape iPhone photos end up
 * with the stamp running vertically up the side.
 */
export async function stampPhoto(buffer: Buffer, meta: StampMetadata): Promise<Buffer> {
  // rotate() honors EXIF orientation; this also strips orientation from
  // the output so downstream consumers don't double-rotate.
  let pipeline = sharp(buffer, { limitInputPixels: SHARP_PIXEL_LIMIT }).rotate()
  const inputMeta = await pipeline.metadata()

  if (!inputMeta.width || !inputMeta.height) {
    throw new Error('Invalid image dimensions')
  }

  // Downsample the stamped derivative if needed — originals keep full
  // resolution for forensic export.
  const longestSide = Math.max(inputMeta.width, inputMeta.height)
  if (longestSide > STAMPED_MAX_DIMENSION) {
    pipeline = pipeline.resize({
      width: inputMeta.width >= inputMeta.height ? STAMPED_MAX_DIMENSION : undefined,
      height: inputMeta.height > inputMeta.width ? STAMPED_MAX_DIMENSION : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Re-read post-resize dimensions for accurate SVG geometry.
  const resizedBuffer = await pipeline.toBuffer()
  const final = sharp(resizedBuffer)
  const { width, height } = await final.metadata()
  if (!width || !height) {
    throw new Error('Invalid image dimensions after resize')
  }

  const fontSize = Math.max(16, Math.round(width / 60))
  const padding = Math.round(fontSize * 0.6)
  const lineHeight = Math.round(fontSize * 1.4)

  const lines: string[] = [
    formatStampDate(meta.capturedAt, meta.timezone),
    `Job ${meta.jobNumber} · ${meta.techName}`,
  ]
  if (meta.gps) {
    lines.push(`${meta.gps.lat.toFixed(5)}, ${meta.gps.lng.toFixed(5)}`)
  }

  const boxHeight = lines.length * lineHeight + padding
  const boxY = height - boxHeight - padding
  const boxX = padding
  const boxWidth = Math.min(width - padding * 2, Math.round(width * 0.85))

  // SVG composite — sharp rasterizes via librsvg internally. The text
  // uses paint-order: stroke fill so the black stroke renders behind
  // the yellow fill, giving the readable-on-anything outline effect.
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .stamp {
      font-family: 'Courier New', 'Courier', monospace;
      font-size: ${fontSize}px;
      font-weight: bold;
      fill: ${STAMP_TEXT_COLOR};
      stroke: #000;
      stroke-width: ${(fontSize / 12).toFixed(2)};
      paint-order: stroke fill;
    }
  </style>
  <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" fill="${STAMP_BG}" rx="4" />
  ${lines
    .map((line, i) => {
      const y = boxY + padding / 2 + (i + 1) * lineHeight - Math.round(fontSize * 0.3)
      return `<text x="${boxX + padding}" y="${y}" class="stamp">${escapeXml(line)}</text>`
    })
    .join('\n  ')}
</svg>`

  return await final
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()
}

/**
 * Resolve the best available capture timestamp.
 *
 * Order of preference:
 *   1. EXIF DateTimeOriginal (forensic ground truth — when the shutter fired)
 *   2. Client-reported timestamp (devices without writeable EXIF, screenshots)
 *   3. Server upload time (last-resort fallback; tamper-evident upper bound)
 */
export function resolveCapturedAt({
  exif,
  client,
  uploadedAt,
}: {
  exif: Date | null
  client: Date | null
  uploadedAt: Date
}): { value: Date; source: 'exif' | 'client' | 'server' } {
  if (exif) return { value: exif, source: 'exif' }
  if (client) return { value: client, source: 'client' }
  return { value: uploadedAt, source: 'server' }
}
