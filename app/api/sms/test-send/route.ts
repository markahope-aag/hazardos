import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { sendTestSmsSchema } from '@/lib/validations/sms'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/sms/test-send
 * Send a one-off test SMS to verify Twilio wiring (SMS10). Admin only —
 * this uses live Twilio credentials and incurs a real message charge.
 * Bypasses the sms_enabled toggle and quiet hours so admins can confirm
 * setup before turning SMS on.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'auth',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: sendTestSmsSchema,
  },
  async (_request, context, body) => {
    const message = await SmsService.sendTest(context.profile.organization_id, body.to)
    return NextResponse.json(message, { status: 201 })
  }
)
