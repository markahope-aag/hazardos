import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import {
  updateNotificationPreferenceSchema,
  notificationPreferencesQuerySchema,
} from '@/lib/validations/notifications'

/**
 * GET /api/notifications/preferences[?user_id=...]
 *
 * Without `user_id` → returns the caller's own preferences.
 * With `user_id` → returns that user's preferences (admin only,
 * enforced inside NotificationService.resolvePreferenceTarget).
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: notificationPreferencesQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const preferences = await NotificationService.getPreferences(query?.user_id)
    return NextResponse.json(preferences)
  }
)

/**
 * PATCH /api/notifications/preferences
 *
 * Without `user_id` in body → updates the caller's own preference.
 * With `user_id` → updates that user's preference (admin only).
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateNotificationPreferenceSchema,
  },
  async (_request, _context, body) => {
    const preference = await NotificationService.updatePreference(
      {
        notification_type: body.notification_type,
        in_app: body.in_app,
        email: body.email,
        push: body.push,
      },
      body.user_id,
    )
    return NextResponse.json(preference)
  }
)
