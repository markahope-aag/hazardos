import { NextResponse } from 'next/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

const approvalDecisionSchema = z.object({
  level: z.number().int().min(1).max(2),
  approved: z.boolean(),
  notes: z.string().max(1000).optional(),
})

/**
 * GET /api/approvals/[id]
 * Get an approval request
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const approvalRequest = await ApprovalService.getRequest(params.id)

    if (!approvalRequest) {
      throw new SecureError('NOT_FOUND', 'Approval request not found')
    }

    return NextResponse.json(approvalRequest)
  }
)

/**
 * PATCH /api/approvals/[id]
 * Process an approval (approve/reject)
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: approvalDecisionSchema,
  },
  async (_request, _context, params, body) => {
    let result

    if (body.level === 1) {
      result = await ApprovalService.decideLevel1(params.id, { approved: body.approved, notes: body.notes })
    } else {
      result = await ApprovalService.decideLevel2(params.id, { approved: body.approved, notes: body.notes })
    }

    return NextResponse.json(result)
  }
)
