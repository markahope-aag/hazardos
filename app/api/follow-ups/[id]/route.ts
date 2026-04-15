import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { FollowUpsService } from '@/lib/services/follow-ups-service'
import { updateFollowUpSchema } from '@/lib/validations/follow-ups'

/**
 * GET /api/follow-ups/[id]
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const followUp = await FollowUpsService.get(params.id)
    if (!followUp) {
      throw new SecureError('NOT_FOUND', 'Follow-up not found')
    }
    return NextResponse.json({ follow_up: followUp })
  }
)

/**
 * PATCH /api/follow-ups/[id]
 * Reschedule, reassign, edit note, or mark complete/reopen.
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateFollowUpSchema,
  },
  async (_request, _context, params, body) => {
    const followUp = await FollowUpsService.update(params.id, body)
    return NextResponse.json({ follow_up: followUp })
  }
)

/**
 * DELETE /api/follow-ups/[id]
 */
export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await FollowUpsService.delete(params.id)
    return NextResponse.json({ success: true })
  }
)
