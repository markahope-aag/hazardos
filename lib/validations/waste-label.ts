import { z } from 'zod'
import { LABELS_PER_SHEET } from '@/lib/pdf/waste-label-template'

// Upper bound on a single generation. 20 sheets of Avery 5162 is already
// far more than any one job needs; the cap exists so a typo in the count
// field can't ask the renderer for thousands of pages.
export const MAX_LABELS = LABELS_PER_SHEET * 20

// Schema for the waste container label sheet.
//
// Every field is pre-filled from the organisation and the job, but all of
// them stay editable: the generator on a NESHAP label is whoever legally
// produced the waste, which is not always the billing contact we hold on
// the job, and crews sometimes label for a specific building or unit
// rather than the job's street address.
export const wasteLabelGenerateSchema = z.object({
  contractor_name: z.string().trim().min(1, 'Contractor name is required').max(200),
  contractor_address: z.string().trim().max(255).default(''),
  contractor_city: z.string().trim().max(100).default(''),
  contractor_state: z.string().trim().max(50).default(''),
  contractor_zip: z.string().trim().max(20).default(''),

  generator: z.string().trim().min(1, 'Generator is required').max(200),
  location: z.string().trim().min(1, 'Location is required').max(255),

  label_count: z
    .number()
    .int('Label count must be a whole number')
    .min(1, 'Generate at least one label')
    .max(MAX_LABELS, `Cannot generate more than ${MAX_LABELS} labels at once`)
    .default(LABELS_PER_SHEET),

  // Off by default so the sheet matches the plain generator-identification
  // label the client supplied. When on, each label also carries the OSHA
  // 1926.1101(k)(8) warning wording for crews whose container stock is not
  // already pre-printed with it.
  include_warning: z.boolean().default(false),
})

export type WasteLabelGenerateInput = z.infer<typeof wasteLabelGenerateSchema>
