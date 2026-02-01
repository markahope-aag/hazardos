import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/feedback/stats
 * Get feedback statistics
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const stats = await FeedbackService.getFeedbackStats()
    return NextResponse.json(stats)
  }
)
