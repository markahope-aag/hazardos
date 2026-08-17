import { NextResponse } from 'next/server'
import { ROLES } from '@/lib/auth/roles'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ApprovalService } from '@/lib/services/approval-service'
import { z } from 'zod'

const reviewSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(2000).optional(),
})

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: reviewSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, params, body) => {
    const result = await ApprovalService.reviewEstimate(params.id, {
      approved: body.approved,
      notes: body.notes,
    })
    return NextResponse.json(result)
  },
)
