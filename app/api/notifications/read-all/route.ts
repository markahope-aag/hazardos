// route-guard: no role list, marks the caller's own notifications read. The handler
// scopes every query to the authenticated user, so a role check would
// add nothing and would wrongly exclude roles that legitimately have one.
import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
  },
  async () => {
    await NotificationService.markAllAsRead()
    return NextResponse.json({ success: true })
  }
)
