import { z } from 'zod'

// Common ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID'),
})

// Common pagination query
export const paginationQuerySchema = z.object({
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Common search query
export const searchQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Date range query
export const dateRangeQuerySchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Common contact schema
export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  title: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  role: z.string().max(100).optional(),
  is_primary: z.boolean().optional().default(false),
  preferred_contact_method: z.enum(['email', 'phone', 'mobile']).optional(),
  notes: z.string().max(1000).optional(),
})

// Address schema
export const addressSchema = z.object({
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(10).optional(),
})

// Money amount (cents)
export const moneySchema = z.number().int().min(0)

// Percentage (0-100)
export const percentageSchema = z.number().min(0).max(100)

// Date string (YYYY-MM-DD)
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

// Time string (HH:MM)
export const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')

// UUID
export const uuidSchema = z.string().uuid('Invalid UUID')

// Email with empty string allowed
export const optionalEmailSchema = z.string().email('Invalid email').optional().or(z.literal(''))

// Phone number
export const phoneSchema = z.string().max(20).optional()

// Export types
export type IdParam = z.infer<typeof idParamSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>
export type Contact = z.infer<typeof contactSchema>
export type Address = z.infer<typeof addressSchema>
