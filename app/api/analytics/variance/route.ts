import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { z } from 'zod'

const varianceQuerySchema = z.object({
  summary: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  hazard_types: z.string().optional(),
  variance_threshold: z.string().optional(),
}).passthrough()

/**
 * GET /api/analytics/variance
 * Get variance analysis for jobs
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: varianceQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const summary = query.summary === 'true'

    const filters = {
      start_date: query.start_date || undefined,
      end_date: query.end_date || undefined,
      customer_id: query.customer_id || undefined,
      hazard_types: query.hazard_types?.split(',').filter(Boolean) || undefined,
      variance_threshold: query.variance_threshold
        ? parseFloat(query.variance_threshold)
        : undefined,
    }

    if (summary) {
      const varianceSummary = await JobCompletionService.getVarianceSummary(filters)
      return NextResponse.json(varianceSummary)
    }

    const variance = await JobCompletionService.getVarianceAnalysis(filters)
    return NextResponse.json(variance)
  }
)
