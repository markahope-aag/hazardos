/**
 * Names a lab report file the way the office needs to read it.
 *
 * From the client call: "if I then send the file to somebody else, they would
 * not just have lab 2026 42 16." The reference they gave is their existing
 * convention:
 *
 *     Ace of Space lab report NAD (2122 Rowley Ave MSN) 5-1-2026.pdf
 *     └── who ──────┘         └┬┘ └──── where ───────┘ └── when ──┘
 *                              result
 *
 * So: who it was for, the headline result, the site, and the date — each part
 * dropped rather than left blank when we don't hold it.
 */

/** Filesystem- and email-safe, without mangling the readable shape. */
function sanitize(part: string): string {
  return part
    .replace(/[\\/:*?"<>|]/g, '') // illegal on Windows, awkward everywhere
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * `5-1-2026` — the client's own format, not ISO.
 *
 * Date-only strings are read component-wise rather than through `new Date`,
 * which would treat "2026-07-14" as UTC midnight and render it as the 13th
 * for anyone west of UTC. These come from DATE columns (ordered_date,
 * received_date) and mean a calendar day, not an instant — being a day out on
 * a regulated document is not acceptable.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null

  if (typeof value === 'string') {
    const m = value.match(DATE_ONLY)
    if (m) return `${Number(m[2])}-${Number(m[3])}-${m[1]}`
  }

  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`
}

/**
 * Condenses a city to the short form the client writes by hand — "Madison"
 * becomes "MSN". Only applied to cities we have an agreed abbreviation for;
 * anything else is left in full rather than guessed at.
 */
const CITY_ABBREVIATIONS: Record<string, string> = {
  madison: 'MSN',
}

function formatSite(address?: string | null, city?: string | null): string | null {
  const parts: string[] = []
  if (address?.trim()) parts.push(sanitize(address))
  if (city?.trim()) {
    const key = city.trim().toLowerCase()
    parts.push(CITY_ABBREVIATIONS[key] ?? sanitize(city))
  }
  return parts.length ? parts.join(' ') : null
}

export interface LabReportFilenameInput {
  /** Who the report is for — customer or company name. */
  subject?: string | null
  /** Headline finding, e.g. "NAD". Omitted while results are outstanding. */
  result?: string | null
  siteAddress?: string | null
  siteCity?: string | null
  /** Date of the report; falls back to the ordered date. */
  date?: string | Date | null
  /** Used only when nothing else is known, so the file is never nameless. */
  reportNumber?: string | null
  extension?: string
}

export function buildLabReportFilename(input: LabReportFilenameInput): string {
  const segments: string[] = []

  if (input.subject?.trim()) segments.push(sanitize(input.subject))
  segments.push('lab report')
  if (input.result?.trim()) segments.push(sanitize(input.result))

  const site = formatSite(input.siteAddress, input.siteCity)
  if (site) segments.push(`(${site})`)

  const date = formatDate(input.date)
  if (date) segments.push(date)

  // Nothing but the boilerplate means we know almost nothing about this
  // report — fall back to its number so the file is still identifiable.
  const meaningful = segments.filter((s) => s !== 'lab report').length > 0
  if (!meaningful && input.reportNumber) segments.push(sanitize(input.reportNumber))

  const ext = (input.extension ?? 'pdf').replace(/^\./, '')
  return `${segments.join(' ')}.${ext}`
}

/**
 * The headline result for the filename. A report is only "NAD" when every
 * sample came back clean — one detection makes the whole submission a
 * detection, and labelling it NAD would be actively misleading.
 */
export function summariseResult(
  samples: Array<{ result?: string | null }> | null | undefined,
): string | null {
  if (!samples || samples.length === 0) return null

  const withResults = samples.filter((s) => s.result?.trim())
  if (withResults.length === 0) return null
  // Partial results aren't a summary yet.
  if (withResults.length < samples.length) return null

  const allNad = withResults.every((s) => /^nad$/i.test(s.result!.trim()))
  return allNad ? 'NAD' : 'DETECTED'
}
