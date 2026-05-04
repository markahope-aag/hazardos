import { describe, it, expect } from 'vitest'
import { generateICal } from '@/lib/services/ical-generator'

describe('generateICal', () => {
  it('builds calendar with one all-day event from YYYY-MM-DD', () => {
    const ics = generateICal({
      calendarName: 'HazardOS',
      prodId: '-//HazardOS//Test//EN',
      events: [
        {
          uid: 'evt-1@hazardos',
          summary: 'Site visit',
          start: '2026-05-15',
          allDay: true,
        },
      ],
    })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('UID:evt-1@hazardos')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260515')
    expect(ics).toContain('DTEND;VALUE=DATE:20260516')
    expect(ics).toContain('SUMMARY:Site visit')
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/)
  })

  it('uses exclusive end for all-day when end date provided', () => {
    const ics = generateICal({
      calendarName: 'C',
      prodId: '-//x//EN',
      events: [
        {
          uid: 'e2',
          summary: 'Range',
          start: '2026-01-01',
          end: '2026-01-03',
          allDay: true,
        },
      ],
    })
    expect(ics).toContain('DTSTART;VALUE=DATE:20260101')
    expect(ics).toContain('DTEND;VALUE=DATE:20260104')
  })

  it('emits UTC DTSTART/DTEND for timed events', () => {
    const start = new Date(Date.UTC(2026, 4, 3, 14, 30, 0))
    const end = new Date(Date.UTC(2026, 4, 3, 15, 0, 0))
    const ics = generateICal({
      calendarName: 'T',
      prodId: '-//t//EN',
      events: [
        {
          uid: 'timed',
          summary: 'Meeting',
          start,
          end,
          allDay: false,
        },
      ],
    })
    expect(ics).toContain('DTSTART:20260503T143000Z')
    expect(ics).toContain('DTEND:20260503T150000Z')
  })

  it('escapes RFC 5545 special characters in text fields', () => {
    const ics = generateICal({
      calendarName: 'A;B',
      prodId: '-//p//EN',
      events: [
        {
          uid: 'esc',
          summary: 'one\\two',
          description: 'line1\nline2',
          location: 'Main, St',
          url: 'https://x.example/y,z',
          start: '2026-06-01',
          allDay: true,
        },
      ],
    })
    expect(ics).toContain('X-WR-CALNAME:A\\;B')
    expect(ics).toContain('SUMMARY:one\\\\two')
    expect(ics).toContain('DESCRIPTION:line1\\nline2')
    expect(ics).toContain('LOCATION:Main\\, St')
    expect(ics).toContain('URL:https://x.example/y\\,z')
  })

  it('folds very long SUMMARY lines', () => {
    const long = 'a'.repeat(120)
    const ics = generateICal({
      calendarName: 'L',
      prodId: '-//l//EN',
      events: [{ uid: 'long', summary: long, start: '2026-07-01', allDay: true }],
    })
    expect(ics).toContain('\r\n ')
    expect(ics).toMatch(/SUMMARY:a+/)
    // Unfold per RFC 5545 (CRLF + single space = continuation) and verify all
    // bytes are preserved across the fold.
    expect(ics.replace(/\r\n /g, '')).toContain(long)
  })

  it('ends lines with CRLF and trailing newline', () => {
    const ics = generateICal({
      calendarName: 'N',
      prodId: '-//n//EN',
      events: [],
    })
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics).not.toContain('\n\n')
  })
})
