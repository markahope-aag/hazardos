import { NextResponse } from 'next/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { approvalListQuerySchema, createApprovalSchema } from '@/lib/validations/approvals'

/**
 * GET /api/approvals
 * List approval requests
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: approvalListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const requests = await ApprovalService.getRequests({
      entity_type: query.entity_type,
      status: query.status,
      pending_only: query.pending_only === 'true',
    })

    return NextResponse.json(requests)
  }
)

/**
 * POST /api/approvals
 * Create an approval request
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createApprovalSchema,
  },
  async (_request, _context, body) => {
    const approvalRequest = await ApprovalService.createRequest({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      amount: body.amount,
    })

    return NextResponse.json(approvalRequest)
  }
)
