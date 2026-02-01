import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { updateNotificationPreferenceSchema } from '@/lib/validations/notifications'

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async () => {
    const preferences = await NotificationService.getPreferences()
    return NextResponse.json(preferences)
  }
)

/**
 * PATCH /api/notifications/preferences
 * Update a notification preference
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateNotificationPreferenceSchema,
  },
  async (_request, _context, body) => {
    const preference = await NotificationService.updatePreference({
      notification_type: body.notification_type,
      in_app: body.in_app,
      email: body.email,
      push: body.push,
    })
    return NextResponse.json(preference)
  }
)
