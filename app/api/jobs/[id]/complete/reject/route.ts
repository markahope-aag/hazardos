import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { rejectCompletionSchema } from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/complete/reject
 * Reject a job completion (admin only)
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: rejectCompletionSchema,
    allowedRoles: ['admin', 'tenant_owner', 'platform_owner', 'platform_admin'],
  },
  async (_request, _context, params, body) => {
    const completion = await JobCompletionService.rejectCompletion(params.id, {
      rejection_reason: body.rejection_reason,
      review_notes: body.review_notes,
    })
    return NextResponse.json(completion)
  }
)
