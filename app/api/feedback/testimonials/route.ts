import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/feedback/testimonials
 * Get approved testimonials
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const testimonials = await FeedbackService.getApprovedTestimonials()
    return NextResponse.json(testimonials)
  }
)
