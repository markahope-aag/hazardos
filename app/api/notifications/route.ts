import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { notificationListQuerySchema, createNotificationSchema } from '@/lib/validations/notifications'

/**
 * GET /api/notifications
 * List notifications for the current user with pagination
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: notificationListQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const unreadOnly = query.unread === 'true'

    // Fetch the list and the unread count in a single round-trip so
    // the notification bell can render badge + dropdown from one
    // request instead of polling /api/notifications + /count every
    // 30 seconds.
    const [result, unreadCount] = await Promise.all([
      unreadOnly
        ? NotificationService.getUnread({
            limit: query.limit,
            offset: query.offset,
          })
        : NotificationService.getAll({
            limit: query.limit,
            offset: query.offset,
          }),
      NotificationService.getUnreadCount(),
    ])

    return NextResponse.json({ ...result, unread_count: unreadCount })
  }
)

/**
 * POST /api/notifications
 * Create a new notification
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
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
