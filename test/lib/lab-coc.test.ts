import { describe, it, expect } from 'vitest'
import {
  labCocGenerateSchema,
  cocSampleSchema,
  COC_FORM_TITLES,
  MAX_COC_SAMPLES,
} from '@/lib/validations/lab-coc'

const valid = {
  report_number: 'LAB-2026-4210',
  form_title: 'Asbestos Bulk Sampling',
  contractor_name: 'Summit Abatement Services',
  lab_name: 'Rocky Mountain Analytical',
  site_address: '2122 Rowley Ave',
  collected_date: '2026-05-01',
  turnaround: 'Same day',
  samples: [
    { sample_number: '1', description: 'Insulation inside the walls of the sunroom' },
    { sample_number: '2', description: 'Wall board inside of the sunroom' },
  ],
}

describe('labCocGenerateSchema', () => {
  it('accepts a well-formed submission', () => {
    const parsed = labCocGenerateSchema.parse(valid)
    expect(parsed.samples).toHaveLength(2)
    expect(parsed.contractor_address).toBe('')
  })

  it('rejects duplicate sample numbers', () => {
    // The lab logs results against the sample number. Two samples sharing a
    // number makes the returned results ambiguous.
    expect(() =>
      labCocGenerateSchema.parse({
        ...valid,
        samples: [
          { sample_number: '1', description: 'First' },
          { sample_number: '1', description: 'Second' },
        ],
      }),
    ).toThrow(/unique/i)
  })

  it('treats sample numbers as case-insensitive for uniqueness', () => {
    expect(() =>
      labCocGenerateSchema.parse({
        ...valid,
        samples: [
          { sample_number: '1a', description: 'First' },
          { sample_number: '1A', description: 'Second' },
        ],
      }),
    ).toThrow(/unique/i)
  })

  it('requires at least one sample', () => {
    expect(() => labCocGenerateSchema.parse({ ...valid, samples: [] })).toThrow()
  })

  it('caps the number of samples on one form', () => {
    const many = Array.from({ length: MAX_COC_SAMPLES + 1 }, (_, i) => ({
      sample_number: String(i + 1),
      description: 'Sample',
    }))
    expect(() => labCocGenerateSchema.parse({ ...valid, samples: many })).toThrow()
  })

  it('requires contractor, lab, site and turnaround', () => {
    for (const field of ['contractor_name', 'lab_name', 'site_address', 'turnaround'] as const) {
      expect(() => labCocGenerateSchema.parse({ ...valid, [field]: '   ' })).toThrow()
    }
  })

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(() => labCocGenerateSchema.parse({ ...valid, collected_date: '5/1/2026' })).toThrow()
  })

  it('trims whitespace around sample fields', () => {
    const parsed = cocSampleSchema.parse({
      sample_number: '  3 ',
      description: '  Ceiling tiles  ',
      location: '  Sunroom  ',
    })
    expect(parsed.sample_number).toBe('3')
    expect(parsed.description).toBe('Ceiling tiles')
    expect(parsed.location).toBe('Sunroom')
  })

  it('defaults an absent sample location to empty rather than undefined', () => {
    const parsed = cocSampleSchema.parse({ sample_number: '1', description: 'X' })
    expect(parsed.location).toBe('')
  })
})

describe('COC_FORM_TITLES', () => {
  it('titles the form by sample type so the lab intake desk can sort it', () => {
    expect(COC_FORM_TITLES.asbestos_bulk).toBe('Asbestos Bulk Sampling')
    expect(COC_FORM_TITLES.lead_dust).toBe('Lead Dust Wipe Sampling')
    expect(COC_FORM_TITLES.mold_surface).toBe('Mould Surface Sampling')
  })

  it('has a title for every sample type the database allows', () => {
    // Mirrors the lab_sample_type enum — a missing entry would render a
    // blank heading on a document going to a third party.
    const dbSampleTypes = [
      'asbestos_bulk', 'asbestos_air', 'lead_paint', 'lead_dust', 'lead_water',
      'lead_soil', 'mold_air', 'mold_surface', 'silica', 'other',
    ]
    for (const t of dbSampleTypes) {
      expect(COC_FORM_TITLES[t], `missing title for ${t}`).toBeTruthy()
    }
  })
})
