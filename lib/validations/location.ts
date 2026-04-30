import { z } from 'zod'

const phoneRegex = /^[\d\s+()\-.]*$/

export const locationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  code: z.string().trim().max(20).optional().nullable(),
  address_line1: z.string().trim().max(200).optional().nullable(),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(50).optional().nullable(),
  zip: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(50).optional().nullable(),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(phoneRegex, 'Invalid phone number')
    .optional()
    .nullable(),
  email: z.string().trim().email('Invalid email').max(200).optional().nullable().or(z.literal('')),
  timezone: z.string().trim().max(60).optional().nullable(),
  is_headquarters: z.boolean().optional(),
})

export const updateLocationSchema = locationSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type LocationInput = z.infer<typeof locationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
