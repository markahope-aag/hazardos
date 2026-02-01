import { NextResponse } from 'next/server'
import { SmsService } from '@/lib/services/sms-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createSmsTemplateSchema } from '@/lib/validations/sms'

/**
 * GET /api/sms/templates
 * List SMS templates
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const templates = await SmsService.getTemplates(context.profile.organization_id)
    return NextResponse.json(templates)
  }
)

/**
 * POST /api/sms/templates
 * Create an SMS template (admin only)
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ['admin', 'owner'],
    bodySchema: createSmsTemplateSchema,
  },
  async (_request, context, body) => {
    const template = await SmsService.createTemplate(context.profile.organization_id, {
      name: body.name,
      message_type: body.message_type,
      body: body.body,
    })
    return NextResponse.json(template, { status: 201 })
  }
)
