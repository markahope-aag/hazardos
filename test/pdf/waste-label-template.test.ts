import { describe, it, expect, vi } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { WasteLabelPdf, LABELS_PER_SHEET } from '@/lib/pdf/waste-label-template'
import { wasteLabelGenerateSchema, MAX_LABELS } from '@/lib/validations/waste-label'

const BASE = {
  contractor_name: 'Advanced Health and Safety',
  contractor_address: '5940 Seminole Centre Crt Ste 225A',
  contractor_city: 'Madison',
  contractor_state: 'WI',
  contractor_zip: '53711',
  generator: 'Hunter Herm',
  location: '913 N Wingra Dr Madison, WI 53715',
  label_count: LABELS_PER_SHEET,
  include_warning: false,
}

/** PDFs declare their page count as `/Count N` in the page-tree node. */
function pageCount(pdf: Buffer): number {
  const matches = [...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)]
  if (matches.length === 0) throw new Error('no /Count in PDF')
  return Math.max(...matches.map((m) => Number(m[1])))
}

describe('waste label sheet', () => {
  // Real PDF renders, ~4-5s each, against vitest's 5s default. The file passes
  // in isolation and times out once the whole suite competes for CPU. Slow, not
  // broken: stubbing the renderer would leave the page-count assertions below
  // checking nothing at all.
  vi.setConfig({ testTimeout: 30_000 })

  it('lays out 14 labels per sheet (Avery 5162)', () => {
    // 2 columns x 7 rows. If this changes, the sheet no longer lines up
    // with the die-cuts and every printed label is skewed.
    expect(LABELS_PER_SHEET).toBe(14)
  })

  it('renders a single-sheet PDF for a full sheet of labels', async () => {
    const pdf = await renderToBuffer(WasteLabelPdf(BASE))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBe(1)
  })

  it('spills onto a second sheet once the count exceeds one sheet', async () => {
    const pdf = await renderToBuffer(WasteLabelPdf({ ...BASE, label_count: LABELS_PER_SHEET + 1 }))
    expect(pageCount(pdf)).toBe(2)
  })

  it('renders exactly the sheets needed for a partial last sheet', async () => {
    const pdf = await renderToBuffer(WasteLabelPdf({ ...BASE, label_count: 20 }))
    expect(pageCount(pdf)).toBe(2)
  })

  it('renders a single label without erroring', async () => {
    const pdf = await renderToBuffer(WasteLabelPdf({ ...BASE, label_count: 1 }))
    expect(pageCount(pdf)).toBe(1)
  })

  it('renders with the OSHA warning block enabled', async () => {
    const pdf = await renderToBuffer(WasteLabelPdf({ ...BASE, include_warning: true }))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBe(1)
  })

  it('omits blank address lines rather than printing empty rows', async () => {
    // A partially-filled organization address should still render. This
    // is the common case for orgs that never completed their profile.
    const pdf = await renderToBuffer(
      WasteLabelPdf({
        ...BASE,
        contractor_address: '',
        contractor_city: '',
        contractor_state: '',
        contractor_zip: '',
      }),
    )
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })
})

describe('waste label validation', () => {
  it('defaults to one full sheet and no warning block', () => {
    const parsed = wasteLabelGenerateSchema.parse({
      contractor_name: 'Acme',
      generator: 'Owner',
      location: '1 Main St',
    })
    expect(parsed.label_count).toBe(LABELS_PER_SHEET)
    expect(parsed.include_warning).toBe(false)
  })

  it('requires contractor, generator and location', () => {
    for (const missing of ['contractor_name', 'generator', 'location'] as const) {
      const input: Record<string, unknown> = {
        contractor_name: 'Acme',
        generator: 'Owner',
        location: '1 Main St',
      }
      input[missing] = '   '
      expect(() => wasteLabelGenerateSchema.parse(input)).toThrow()
    }
  })

  it('rejects a label count above the cap', () => {
    expect(() =>
      wasteLabelGenerateSchema.parse({
        contractor_name: 'Acme',
        generator: 'Owner',
        location: '1 Main St',
        label_count: MAX_LABELS + 1,
      }),
    ).toThrow()
  })

  it('rejects zero and fractional label counts', () => {
    for (const label_count of [0, -3, 2.5]) {
      expect(() =>
        wasteLabelGenerateSchema.parse({
          contractor_name: 'Acme',
          generator: 'Owner',
          location: '1 Main St',
          label_count,
        }),
      ).toThrow()
    }
  })
})
