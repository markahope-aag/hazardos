import { describe, it, expect } from 'vitest'
import { buildLabReportFilename, summariseResult } from '@/lib/utils/lab-report-filename'

describe('buildLabReportFilename', () => {
  it('matches the format the client already uses', () => {
    // Their reference file, reproduced exactly.
    expect(
      buildLabReportFilename({
        subject: 'Ace of Space',
        result: 'NAD',
        siteAddress: '2122 Rowley Ave',
        siteCity: 'Madison',
        date: '2026-05-01',
      }),
    ).toBe('Ace of Space lab report NAD (2122 Rowley Ave MSN) 5-1-2026.pdf')
  })

  it('drops parts we do not hold rather than leaving gaps', () => {
    expect(
      buildLabReportFilename({ subject: 'Alpine Ridge HOA', date: '2026-07-14' }),
    ).toBe('Alpine Ridge HOA lab report 7-14-2026.pdf')
  })

  it('omits the result while samples are still out', () => {
    const name = buildLabReportFilename({
      subject: 'Kessler GC',
      siteAddress: '2100 Curtis Street',
      date: '2026-07-27',
    })
    expect(name).toBe('Kessler GC lab report (2100 Curtis Street) 7-27-2026.pdf')
    expect(name).not.toMatch(/NAD|DETECTED/)
  })

  it('falls back to the report number when nothing else is known', () => {
    expect(buildLabReportFilename({ reportNumber: 'LAB-2026-4210' })).toBe(
      'lab report LAB-2026-4210.pdf',
    )
  })

  it('strips characters that break filesystems', () => {
    const name = buildLabReportFilename({
      subject: 'A/B: Test*Co?',
      siteAddress: '1 Main St',
      date: '2026-01-05',
    })
    expect(name).not.toMatch(/[\\/:*?"<>|]/)
    expect(name).toBe('AB TestCo lab report (1 Main St) 1-5-2026.pdf')
  })

  it('leaves unfamiliar cities in full rather than inventing an abbreviation', () => {
    expect(
      buildLabReportFilename({ subject: 'X', siteAddress: '5 Elm', siteCity: 'Commerce City' }),
    ).toBe('X lab report (5 Elm Commerce City).pdf')
  })

  it('ignores an unparseable date instead of writing NaN', () => {
    expect(buildLabReportFilename({ subject: 'X', date: 'not a date' })).toBe('X lab report.pdf')
  })

  it('reads a DATE column as a calendar day, not a UTC instant', () => {
    // Regression: new Date('2026-07-14') is UTC midnight, which renders as
    // the 13th anywhere west of UTC.
    expect(buildLabReportFilename({ subject: 'X', date: '2026-07-14' })).toBe(
      'X lab report 7-14-2026.pdf',
    )
  })

  it('honours a non-pdf extension', () => {
    expect(buildLabReportFilename({ subject: 'X', extension: '.jpg' })).toBe('X lab report.jpg')
  })
})

describe('summariseResult', () => {
  it('reports NAD only when every sample is clean', () => {
    expect(summariseResult([{ result: 'NAD' }, { result: 'NAD' }])).toBe('NAD')
  })

  it('treats a single detection as a detection for the whole submission', () => {
    // Labelling this NAD because most samples were clean would be actively
    // misleading on a regulated document.
    expect(summariseResult([{ result: 'NAD' }, { result: 'Chrysotile 3%' }])).toBe('DETECTED')
  })

  it('gives no summary while results are partial', () => {
    expect(summariseResult([{ result: 'NAD' }, { result: null }])).toBeNull()
  })

  it('gives no summary with no samples or no results', () => {
    expect(summariseResult([])).toBeNull()
    expect(summariseResult(null)).toBeNull()
    expect(summariseResult([{ result: '  ' }])).toBeNull()
  })
})
