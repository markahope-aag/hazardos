/**
 * Minimal RFC 5545 iCalendar generator. Supports the subset HazardOS
 * needs: dated VEVENTs with summary / location / description / URL.
 * No recurrence, no time zones inside DTSTART (we use floating-time
 * dates for whole-day events, which is what calendar clients expect
 * for things like "scheduled for May 15").
 */

export interface ICalEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  url?: string
  start: Date | string // Date or YYYY-MM-DD
  end?: Date | string // exclusive for all-day; if omitted, single-day
  allDay?: boolean
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toDateValue(d: Date): string {
  // YYYYMMDD — used for VALUE=DATE all-day events
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function toUtcStamp(d: Date): string {
  // YYYYMMDDTHHMMSSZ — used for DTSTAMP and timed events
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function parseInputDate(value: Date | string): Date {
  if (value instanceof Date) return value
  // Bare YYYY-MM-DD → local-time midnight (matches how the rest of
  // the app reads scheduled_start_date columns).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

function escape(value: string | undefined): string {
  if (!value) return ''
  // RFC 5545: backslash, semicolon, comma, newline must be escaped.
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function fold(line: string): string {
  // RFC 5545 line-folding: 75 octets max per line, continuation lines
  // begin with a single space. Use byte length for safety with
  // multi-byte characters.
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line

  const chunks: string[] = []
  let cursor = 0
  while (cursor < bytes.length) {
    const slice = bytes.subarray(cursor, cursor + (cursor === 0 ? 75 : 74))
    chunks.push(slice.toString('utf8'))
    cursor += slice.length
  }
  return chunks.join('\r\n ')
}

export function generateICal(opts: {
  calendarName: string
  prodId: string
  events: ICalEvent[]
}): string {
  const now = new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${opts.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(opts.calendarName)}`,
  ]

  for (const ev of opts.events) {
    const start = parseInputDate(ev.start)
    const end = ev.end ? parseInputDate(ev.end) : null

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.uid}`)
    lines.push(`DTSTAMP:${toUtcStamp(now)}`)

    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toDateValue(start)}`)
      // iCal all-day end is exclusive — add one day to the
      // (inclusive) end date the caller passed in.
      const exclusiveEnd = new Date(end || start)
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
      lines.push(`DTEND;VALUE=DATE:${toDateValue(exclusiveEnd)}`)
    } else {
      lines.push(`DTSTART:${toUtcStamp(start)}`)
      if (end) {
        lines.push(`DTEND:${toUtcStamp(end)}`)
      }
    }

    lines.push(fold(`SUMMARY:${escape(ev.summary)}`))
    if (ev.description) lines.push(fold(`DESCRIPTION:${escape(ev.description)}`))
    if (ev.location) lines.push(fold(`LOCATION:${escape(ev.location)}`))
    if (ev.url) lines.push(fold(`URL:${escape(ev.url)}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n'
}
