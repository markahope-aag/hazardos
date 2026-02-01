import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

/**
 * POST /api/notifications/[id]/read
 * Mark a notification as read
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    await NotificationService.markAsRead(params.id)
    return NextResponse.json({ success: true })
  }
)
