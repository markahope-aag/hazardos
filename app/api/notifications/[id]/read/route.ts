// route-guard: no role list, marks the caller's own notification read. The handler
// scopes every query to the authenticated user, so a role check would
// add nothing and would wrongly exclude roles that legitimately have one.
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
