import { z } from 'zod'

export const clockInSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const clockOutSchema = z.object({
  entry_id: z.string().uuid('Invalid entry ID'),
})

export const listMineQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export const submitRangeSchema = z.object({
  from: z.string().min(1, 'Start of range is required'),
  to: z.string().min(1, 'End of range is required'),
})

export const reviewEntriesSchema = z.object({
  entry_ids: z.array(z.string().uuid()).min(1, 'Select at least one entry'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional().nullable(),
})
