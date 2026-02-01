import { z } from 'zod'

// Organization filters query
export const organizationFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  planSlug: z.string().optional(),
  sortBy: z.enum(['created_at', 'name', 'user_count', 'job_count']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
}).passthrough()

// Export types
export type OrganizationFiltersInput = z.infer<typeof organizationFiltersSchema>
