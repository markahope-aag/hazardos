import { z } from 'zod'

// Create: the caller supplies the source job. Everything else is filled
// from the job record at snapshot time.
export const createWorkOrderSchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  notes: z.string().max(5000).optional(),
})

// Shape of the snapshot payload we let the office manager edit while a
// work order is still in draft status. Kept permissive — all fields are
// optional because the manager may clear, add, or reorder anything.
const snapshotSectionsSchema = z
  .object({
    site: z
      .object({
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        zip: z.string().nullable().optional(),
        gate_code: z.string().nullable().optional(),
        lockbox_code: z.string().nullable().optional(),
        contact_onsite_name: z.string().nullable().optional(),
        contact_onsite_phone: z.string().nullable().optional(),
      })
      .optional(),
    job: z
      .object({
        name: z.string().nullable().optional(),
        scheduled_start_date: z.string().nullable().optional(),
        scheduled_start_time: z.string().nullable().optional(),
        scheduled_end_date: z.string().nullable().optional(),
        estimated_duration_hours: z.number().nullable().optional(),
        hazard_types: z.array(z.string()).optional(),
        access_notes: z.string().nullable().optional(),
        special_instructions: z.string().nullable().optional(),
      })
      .optional(),
    crew: z
      .array(
        z.object({
          profile_id: z.string().uuid().nullable().optional(),
          name: z.string().min(1),
          role: z.string().nullable().optional(),
          is_lead: z.boolean().default(false),
          scheduled_start: z.string().nullable().optional(),
          scheduled_end: z.string().nullable().optional(),
        }),
      )
      .optional(),
    equipment: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().nullable().optional(),
          quantity: z.number().default(1),
          is_rental: z.boolean().default(false),
          rental_start_date: z.string().nullable().optional(),
          rental_end_date: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      )
      .optional(),
    materials: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().nullable().optional(),
          quantity_estimated: z.number().nullable().optional(),
          unit: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      )
      .optional(),
    extra_items: z
      .array(
        z.object({
          label: z.string().min(1),
          detail: z.string().nullable().optional(),
        }),
      )
      .optional(),
  })
  .partial()

export const updateWorkOrderSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  snapshot: snapshotSectionsSchema.optional(),
})

export const workOrderVehicleSchema = z.object({
  vehicle_type: z.string().max(50).nullable().optional(),
  make_model: z.string().max(255).nullable().optional(),
  plate: z.string().max(20).nullable().optional(),
  driver_profile_id: z.string().uuid().nullable().optional(),
  driver_name: z.string().max(255).nullable().optional(),
  is_rental: z.boolean().optional(),
  rental_vendor: z.string().max(255).nullable().optional(),
  rental_rate_daily: z.number().nullable().optional(),
  rental_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  rental_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  sort_order: z.number().int().optional(),
})

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>
export type WorkOrderVehicleInput = z.infer<typeof workOrderVehicleSchema>
