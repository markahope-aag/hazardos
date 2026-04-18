import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ApprovalService } from '@/lib/services/approval-service'

// Returns the current approval_request for this estimate (if any). The UI
// uses this to decide whether to show "review" (L1) or "final approval" (L2)
// actions and to display who's currently waiting on whom.
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const state = await ApprovalService.getEstimateApprovalState(params.id)
    return NextResponse.json({ approval_request: state })
  },
)
