import { z } from 'zod'

export const MAX_COC_SAMPLES = 60

// Sample type drives the form's title, since a lab's intake desk sorts by it.
export const COC_FORM_TITLES: Record<string, string> = {
  asbestos_bulk: 'Asbestos Bulk Sampling',
  asbestos_air: 'Asbestos Air Sampling',
  lead_paint: 'Lead Paint Sampling',
  lead_dust: 'Lead Dust Wipe Sampling',
  lead_water: 'Lead Water Sampling',
  lead_soil: 'Lead Soil Sampling',
  mold_air: 'Mould Air Sampling',
  mold_surface: 'Mould Surface Sampling',
  silica: 'Silica Sampling',
  other: 'Sample Submittal',
}

export const cocSampleSchema = z.object({
  sample_number: z.string().trim().min(1, 'Sample number is required').max(20),
  description: z.string().trim().min(1, 'Description is required').max(500),
  location: z.string().trim().max(255).default(''),
})

// Chain-of-custody form payload.
//
// Every field is pre-filled from the lab report, the organisation and the
// job site, and every field stays editable — the person packing samples
// often knows detail the record doesn't carry, and the results frequently
// go to a client PM who isn't the contact on the job.
export const labCocGenerateSchema = z.object({
  report_number: z.string().trim().min(1).max(60),
  form_title: z.string().trim().min(1).max(120),

  contractor_name: z.string().trim().min(1, 'Contractor name is required').max(200),
  contractor_address: z.string().trim().max(255).default(''),
  contractor_city: z.string().trim().max(100).default(''),
  contractor_state: z.string().trim().max(50).default(''),
  contractor_zip: z.string().trim().max(20).default(''),
  contractor_phone: z.string().trim().max(50).default(''),
  contractor_email: z.string().trim().max(200).default(''),

  lab_name: z.string().trim().min(1, 'Lab is required').max(200),
  lab_address: z.string().trim().max(255).default(''),
  lab_phone: z.string().trim().max(50).default(''),

  // Free text: typically a couple of names with phone numbers, one per line.
  submitted_to: z.string().trim().max(600).default(''),

  site_address: z.string().trim().min(1, 'Site address is required').max(255),
  site_city: z.string().trim().max(100).default(''),
  site_state: z.string().trim().max(50).default(''),
  site_zip: z.string().trim().max(20).default(''),

  collected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  turnaround: z.string().trim().min(1, 'Turnaround is required').max(120),
  relinquished_by: z.string().trim().max(200).default(''),

  samples: z
    .array(cocSampleSchema)
    .min(1, 'Add at least one sample')
    .max(MAX_COC_SAMPLES, `A single form cannot carry more than ${MAX_COC_SAMPLES} samples`)
    // The lab logs samples in by number; duplicates make the results
    // ambiguous, and the database enforces this too.
    .refine(
      (samples) => new Set(samples.map((s) => s.sample_number.toLowerCase())).size === samples.length,
      { message: 'Sample numbers must be unique' },
    ),
})

export type LabCocGenerateInput = z.infer<typeof labCocGenerateSchema>
export type CocSampleInput = z.infer<typeof cocSampleSchema>
