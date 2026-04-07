import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { approveCompletionSchema } from '@/lib/validations/jobs'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/jobs/[id]/complete/approve
 * Approve a job completion (admin only)
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: approveCompletionSchema,
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params, body) => {
    const completion = await JobCompletionService.approveCompletion(params.id, {
      review_notes: body.review_notes,
    })
    return NextResponse.json(completion)
  }
)
