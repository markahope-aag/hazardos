import { z } from 'zod'

// Report type (matches ReportType from types/reporting.ts)
export const reportTypeSchema = z.enum([
  'sales',
  'jobs',
  'leads',
  'revenue',
  'custom',
])

// Date range type
export const dateRangeTypeSchema = z.enum([
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'custom',
])

// Chart type
export const chartTypeSchema = z.enum(['bar', 'line', 'pie', 'area', 'none'])

// Filter operator
export const filterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
])

// Column format
export const columnFormatSchema = z.enum(['currency', 'percent', 'number', 'date', 'text'])

// Group interval
export const groupIntervalSchema = z.enum(['day', 'week', 'month', 'quarter', 'year'])

// Date range
export const dateRangeSchema = z.object({
  type: dateRangeTypeSchema,
  start: z.string().optional(),
  end: z.string().optional(),
})

// Report filter
export const reportFilterSchema = z.object({
  field: z.string(),
  operator: filterOperatorSchema,
  value: z.unknown(),
})

// Report column
export const reportColumnSchema = z.object({
  field: z.string(),
  label: z.string(),
  visible: z.boolean(),
  format: columnFormatSchema.optional(),
})

// Report grouping
export const reportGroupingSchema = z.object({
  field: z.string(),
  interval: groupIntervalSchema.optional(),
})

// Report config (matches ReportConfig from types/reporting.ts)
export const reportConfigSchema = z.object({
  date_range: dateRangeSchema,
  filters: z.array(reportFilterSchema),
  grouping: reportGroupingSchema.optional(),
  metrics: z.array(z.string()),
  columns: z.array(reportColumnSchema),
  chart_type: chartTypeSchema,
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

// Create report
export const createReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  report_type: reportTypeSchema,
  config: reportConfigSchema,
  is_shared: z.boolean().optional().default(false),
})

// Update report
export const updateReportSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  config: reportConfigSchema.optional(),
  is_shared: z.boolean().optional(),
  schedule_enabled: z.boolean().optional(),
  schedule_frequency: z.string().optional(),
  schedule_recipients: z.array(z.string()).optional(),
})

// Run report
export const runReportSchema = z.object({
  config: reportConfigSchema,
})

// Export format
export const exportFormatSchema = z.enum(['xlsx', 'csv', 'pdf'])

// Export report
export const exportReportSchema = z.object({
  format: exportFormatSchema,
  title: z.string(),
  data: z.array(z.record(z.string(), z.unknown())),
  columns: z.array(reportColumnSchema),
})

// Export types
export type CreateReportInput = z.infer<typeof createReportSchema>
export type UpdateReportInput = z.infer<typeof updateReportSchema>
export type ReportType = z.infer<typeof reportTypeSchema>
