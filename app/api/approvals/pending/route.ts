import { NextResponse } from 'next/server'
import { ApprovalService } from '@/lib/services/approval-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/approvals/pending
 * Get pending approvals for current user
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const requests = await ApprovalService.getMyPendingApprovals()
    return NextResponse.json(requests)
  }
)
