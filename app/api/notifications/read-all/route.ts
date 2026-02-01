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
