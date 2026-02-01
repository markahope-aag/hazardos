import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { approveCompletionSchema } from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/complete/approve
 * Approve a job completion (admin only)
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: approveCompletionSchema,
    allowedRoles: ['admin', 'tenant_owner', 'platform_owner', 'platform_admin'],
  },
  async (_request, _context, params, body) => {
    const completion = await JobCompletionService.approveCompletion(params.id, {
      review_notes: body.review_notes,
    })
    return NextResponse.json(completion)
  }
)
