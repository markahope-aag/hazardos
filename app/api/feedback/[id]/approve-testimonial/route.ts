import { NextResponse } from 'next/server'
import { FeedbackService } from '@/lib/services/feedback-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

/**
 * POST /api/feedback/[id]/approve-testimonial
 * Approve a testimonial (admin only)
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['admin', 'tenant_owner', 'platform_owner', 'platform_admin'],
  },
  async (_request, _context, params) => {
    const survey = await FeedbackService.approveTestimonial(params.id)
    return NextResponse.json(survey)
  }
)

/**
 * DELETE /api/feedback/[id]/approve-testimonial
 * Reject a testimonial (admin only)
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['admin', 'tenant_owner', 'platform_owner', 'platform_admin'],
  },
  async (_request, _context, params) => {
    const survey = await FeedbackService.rejectTestimonial(params.id)
    return NextResponse.json(survey)
  }
)
