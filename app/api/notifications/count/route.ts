import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/notifications/count
 * Get unread notification count
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async () => {
    const count = await NotificationService.getUnreadCount()
    return NextResponse.json({ count })
  }
)
