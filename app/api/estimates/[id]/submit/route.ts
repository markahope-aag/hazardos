import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ApprovalService } from '@/lib/services/approval-service'
import { z } from 'zod'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: z.object({}).optional(),
  },
  async (_request, _context, params) => {
    const approvalRequest = await ApprovalService.submitEstimateForApproval(params.id)
    return NextResponse.json({ approval_request: approvalRequest })
  },
)
