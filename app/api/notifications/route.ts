import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { notificationListQuerySchema, createNotificationSchema } from '@/lib/validations/notifications'

/**
 * GET /api/notifications
 * List notifications for the current user
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: notificationListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const limit = query.limit || 50
    const unreadOnly = query.unread === 'true'

    const notifications = unreadOnly
      ? await NotificationService.getUnread()
      : await NotificationService.getAll(undefined, limit)

    return NextResponse.json(notifications)
  }
)

/**
 * POST /api/notifications
 * Create a new notification
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createNotificationSchema,
  },
  async (_request, _context, body) => {
    const notification = await NotificationService.create({
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      message: body.message,
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      action_url: body.action_url,
      action_label: body.action_label,
      priority: body.priority,
      metadata: body.metadata,
      expires_at: body.expires_at,
    })

    return NextResponse.json(notification, { status: 201 })
  }
)
