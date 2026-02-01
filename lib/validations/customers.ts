import { z } from 'zod'

// Customer status
export const customerStatusSchema = z.enum(['lead', 'prospect', 'customer', 'inactive'])

// Customer source - matches database type
export const customerSourceSchema = z.enum(['phone', 'website', 'mail', 'referral', 'other'])

// Contact role - matches database type
export const contactRoleSchema = z.enum(['primary', 'billing', 'site', 'scheduling', 'general'])

// Communication preferences
export const communicationPreferencesSchema = z.object({
  email: z.boolean().optional().default(true),
  sms: z.boolean().optional().default(false),
  mail: z.boolean().optional().default(false),
})

// Create customer
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  company_name: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().max(20).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  status: customerStatusSchema.optional().default('lead'),
  source: customerSourceSchema.optional(),
  communication_preferences: communicationPreferencesSchema.optional(),
  marketing_consent: z.boolean().optional(),
  marketing_consent_date: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
})

// Update customer
export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  company_name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  status: customerStatusSchema.optional(),
  source: customerSourceSchema.optional(),
  communication_preferences: communicationPreferencesSchema.optional(),
  marketing_consent: z.boolean().optional(),
  marketing_consent_date: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
})

// Customer list query
export const customerListQuerySchema = z.object({
  status: customerStatusSchema.optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
}).passthrough()

// Create contact
export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  title: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  role: contactRoleSchema.optional(),
  is_primary: z.boolean().optional().default(false),
  preferred_contact_method: z.enum(['email', 'phone', 'mobile']).optional(),
  notes: z.string().max(2000).optional(),
})

// Update contact
export const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  title: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  role: contactRoleSchema.optional(),
  is_primary: z.boolean().optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'mobile']).optional(),
  notes: z.string().max(2000).optional(),
})

// Export types
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerStatus = z.infer<typeof customerStatusSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
