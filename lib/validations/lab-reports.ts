import { z } from 'zod'

const SAMPLE_TYPES = [
  'asbestos_bulk',
  'asbestos_air',
  'lead_paint',
  'lead_dust',
  'lead_water',
  'lead_soil',
  'mold_air',
  'mold_surface',
  'silica',
  'other',
] as const

const STATUSES = ['ordered', 'received', 'cancelled'] as const

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const createLabReportSchema = z.object({
  ordered_date: isoDate,
  lab_id: z.string().uuid().nullable().optional(),
  sample_type: z.enum(SAMPLE_TYPES),
  sample_description: z.string().max(2000).nullable().optional(),

  site_address: z.string().max(500).nullable().optional(),
  site_city: z.string().max(120).nullable().optional(),
  site_state: z.string().max(60).nullable().optional(),
  site_zip: z.string().max(20).nullable().optional(),

  estimate_id: z.string().uuid().nullable().optional(),
  work_order_id: z.string().uuid().nullable().optional(),
  invoice_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),

  notes: z.string().max(4000).nullable().optional(),
})

export const updateLabReportSchema = createLabReportSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
  received_date: isoDate.nullable().optional(),
})

export const listLabReportsQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  sample_type: z.enum(SAMPLE_TYPES).optional(),
  estimate_id: z.string().uuid().optional(),
  work_order_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  // 'unassigned' = location_id IS NULL, uuid = specific location
  location_id: z.string().optional(),
  from_date: isoDate.optional(),
  to_date: isoDate.optional(),
})

export const createLabSchema = z.object({
  name: z.string().min(1).max(200),
  contact_name: z.string().max(200).nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  is_active: z.boolean().optional(),
})

export const updateLabSchema = createLabSchema.partial()

export type CreateLabReportInput = z.infer<typeof createLabReportSchema>
export type UpdateLabReportInput = z.infer<typeof updateLabReportSchema>
export type CreateLabInput = z.infer<typeof createLabSchema>
export type UpdateLabInput = z.infer<typeof updateLabSchema>
