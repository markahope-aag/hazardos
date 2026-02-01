import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { updateSmsSettingsSchema } from '@/lib/validations/sms'

/**
 * GET /api/sms/settings
 * Get SMS settings
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const settings = await SmsService.getSettings(context.profile.organization_id)

    // Return default settings if none exist
    return NextResponse.json(settings || {
      sms_enabled: false,
      appointment_reminders_enabled: true,
      appointment_reminder_hours: 24,
      job_status_updates_enabled: true,
      lead_notifications_enabled: true,
      payment_reminders_enabled: false,
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '08:00',
      timezone: 'America/Chicago',
      use_platform_twilio: true,
    })
  }
)

/**
 * PATCH /api/sms/settings
 * Update SMS settings (admin only)
 */
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ['admin', 'owner'],
    bodySchema: updateSmsSettingsSchema,
  },
  async (_request, context, body) => {
    const settings = await SmsService.updateSettings(context.profile.organization_id, body)
    return NextResponse.json(settings)
  }
)
