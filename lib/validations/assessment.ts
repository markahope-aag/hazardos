import { z } from 'zod'

export const assessmentSchema = z.object({
  // Basic Information
  job_name: z.string().min(1, 'Job name is required').max(100, 'Job name too long'),
  customer_name: z.string().min(1, 'Customer name is required').max(100, 'Customer name too long'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_phone: z.string().optional(),

  // Site Information
  site_address: z.string().min(1, 'Site address is required'),
  site_city: z.string().min(1, 'City is required'),
  site_state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  site_zip: z.string().min(5, 'ZIP code is required').max(10, 'Invalid ZIP code'),

  // Hazard Information
  hazard_type: z.enum(['asbestos', 'mold', 'lead', 'vermiculite', 'other'], {
    message: 'Hazard type is required'
  }),
  hazard_subtype: z.string().optional(),
  containment_level: z.number().min(1).max(4).optional(),

  // Measurements
  area_sqft: z.number().min(0).optional(),
  linear_ft: z.number().min(0).optional(),
  volume_cuft: z.number().min(0).optional(),
  material_type: z.string().optional(),

  // Site Conditions
  occupied: z.boolean().default(false),
  access_issues: z.array(z.string()).optional(),
  special_conditions: z.string().optional(),

  // Regulatory
  clearance_required: z.boolean().default(false),
  clearance_lab: z.string().optional(),
  regulatory_notifications_needed: z.boolean().default(false),

  // Notes
  notes: z.string().optional(),
})

export type AssessmentFormData = z.infer<typeof assessmentSchema>

export const defaultAssessmentValues: Partial<AssessmentFormData> = {
  hazard_type: 'asbestos',
  containment_level: 1,
  occupied: false,
  clearance_required: false,
  regulatory_notifications_needed: false,
  access_issues: [],
}