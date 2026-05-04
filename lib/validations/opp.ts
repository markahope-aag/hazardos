import { z } from 'zod'

// Schema for the OPP wizard payload. Most fields default to empty
// strings rather than .optional() because the rendered PDF still
// needs to lay out the section headings even when the contractor
// leaves a paragraph blank.
export const oppGenerateSchema = z.object({
  // Company info — pre-filled from organization, editable in wizard
  company_name: z.string().min(1).max(200),
  company_license_number: z.string().max(100).default(''),
  company_address: z.string().max(255).default(''),
  company_city: z.string().max(100).default(''),
  company_state: z.string().max(50).default(''),
  company_zip: z.string().max(20).default(''),
  company_contact_name: z.string().max(200).default(''),
  company_phone: z.string().max(50).default(''),

  // Project info — pre-filled from job/property/customer
  property_name: z.string().max(255).default(''),
  property_address: z.string().max(255).default(''),
  property_city: z.string().max(100).default(''),
  property_contact_name: z.string().max(200).default(''),
  property_phone: z.string().max(50).default(''),
  project_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_am: z.boolean().default(false),
  shift_pm: z.boolean().default(false),
  shift_night: z.boolean().default(false),

  // Free-text sections
  project_description: z.string().max(4000).default(''),
  containment: z.string().max(4000).default(''),
  ventilation: z.string().max(4000).default(''),
  work_practices: z.string().max(4000).default(''),
  final_cleaning: z.string().max(4000).default(''),
})

export type OppGenerateInput = z.infer<typeof oppGenerateSchema>

// Schema for updating org-level OPP defaults from Settings.
export const oppDefaultsSchema = z.object({
  containment: z.string().max(4000).optional(),
  ventilation: z.string().max(4000).optional(),
  work_practices: z.string().max(4000).optional(),
  final_cleaning: z.string().max(4000).optional(),
})

export type OppDefaultsInput = z.infer<typeof oppDefaultsSchema>
