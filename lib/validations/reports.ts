import { z } from 'zod'

// Report type
export const reportTypeSchema = z.enum([
  'revenue',
  'jobs',
  'customers',
  'estimates',
  'invoices',
  'custom',
])

// Create report
export const createReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  report_type: reportTypeSchema,
  config: z.record(z.string(), z.unknown()),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().optional().default(false),
})

// Update report
export const updateReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  report_type: reportTypeSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
})

// Run report
export const runReportSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
})

// Export types
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type ReportType = z.infer<typeof reportTypeSchema>
