import { NextResponse } from 'next/server'
import { SegmentationService } from '@/lib/services/segmentation-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

/**
 * POST /api/segments/[id]/calculate
 * Calculate segment members
 */
export const POST = createApiHandlerWithParams(
  { rateLimit: 'heavy' },
  async (_request, _context, params) => {
    const memberCount = await SegmentationService.calculateMembers(params.id)
    return NextResponse.json({ success: true, member_count: memberCount })
  }
)
