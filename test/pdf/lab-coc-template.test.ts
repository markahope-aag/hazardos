import { describe, it, expect, vi } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { LabCocPdf } from '@/lib/pdf/lab-coc-template'
import type { LabCocGenerateInput } from '@/lib/validations/lab-coc'

const BASE: LabCocGenerateInput = {
  report_number: 'LAB-2026-4210',
  form_title: 'Asbestos Bulk Sampling',
  contractor_name: 'Summit Abatement Services',
  contractor_address: '4820 Pecos Street, Unit B',
  contractor_city: 'Denver',
  contractor_state: 'CO',
  contractor_zip: '80211',
  contractor_phone: '(303) 555-0188',
  contractor_email: 'office@summit.test',
  lab_name: 'Rocky Mountain Analytical',
  lab_address: '1290 W Bayaud Avenue, Denver, CO 80223',
  lab_phone: '(303) 555-0410',
  submitted_to: 'Kelly Barton (project)\nFiona Stoner (PM)',
  site_address: '2122 Rowley Ave',
  site_city: 'Madison',
  site_state: 'WI',
  site_zip: '53726',
  collected_date: '2026-05-01',
  turnaround: 'Same day',
  relinquished_by: 'Bob Stigsell',
  samples: [
    { sample_number: '1', description: 'Insulation inside the walls of the sunroom', location: '' },
    { sample_number: '2', description: 'Wall board inside of the sunroom', location: 'Sunroom' },
  ],
}

function pageCount(pdf: Buffer): number {
  const matches = [...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)]
  if (matches.length === 0) throw new Error('no /Count in PDF')
  return Math.max(...matches.map((m) => Number(m[1])))
}

describe('chain-of-custody PDF', () => {
  // These render a real PDF through @react-pdf/renderer, which takes ~4-5s per
  // document. That sits right on vitest's 5s default, so the file passes alone
  // and times out once the full suite competes for CPU. Raising the ceiling is
  // the fix: the tests are slow, not broken, and stubbing the renderer would
  // leave the page-count assertions testing nothing.
  vi.setConfig({ testTimeout: 30_000 })

  it('renders a single-page form', async () => {
    const pdf = (await renderToBuffer(LabCocPdf(BASE))) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBe(1)
  })

  it('renders with a single sample', async () => {
    const pdf = (await renderToBuffer(
      LabCocPdf({ ...BASE, samples: [BASE.samples[0]] }),
    )) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('renders a long sample list without erroring', async () => {
    // A pre-demolition survey can easily be two dozen samples.
    const samples = Array.from({ length: 24 }, (_, i) => ({
      sample_number: String(i + 1),
      description: `Suspect material ${i + 1}`,
      location: `Area ${i + 1}`,
    }))
    const pdf = (await renderToBuffer(LabCocPdf({ ...BASE, samples }))) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(1)
  })

  it('renders when the optional contractor and lab details are blank', async () => {
    // A partially-filled organization profile must still produce a usable
    // form. This goes to the lab with the samples regardless.
    const pdf = (await renderToBuffer(
      LabCocPdf({
        ...BASE,
        contractor_address: '',
        contractor_city: '',
        contractor_state: '',
        contractor_zip: '',
        contractor_phone: '',
        contractor_email: '',
        lab_address: '',
        lab_phone: '',
        submitted_to: '',
        relinquished_by: '',
      }),
    )) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('renders a multi-line "submitted to" block', async () => {
    const pdf = (await renderToBuffer(
      LabCocPdf({ ...BASE, submitted_to: 'One\nTwo\nThree' }),
    )) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('renders sample locations as optional', async () => {
    const pdf = (await renderToBuffer(
      LabCocPdf({
        ...BASE,
        samples: [{ sample_number: '1', description: 'No location given', location: '' }],
      }),
    )) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('handles a site with no city, state or zip', async () => {
    const pdf = (await renderToBuffer(
      LabCocPdf({ ...BASE, site_city: '', site_state: '', site_zip: '' }),
    )) as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })
})
