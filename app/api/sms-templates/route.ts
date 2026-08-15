import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { createSmsTemplateSchema } from '@/lib/validations/sms-templates'

const COLUMNS = 'id, name, message_type, body, is_active, is_system, slug, created_at, updated_at'

/**
 * GET /api/sms-templates
 *
 * Mirrors GET /api/email-templates: returns inactive templates too, since
 * this is the management view.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('sms_templates')
      .select(COLUMNS)
      .eq('organization_id', context.profile.organization_id)
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list sms templates')

    return NextResponse.json({ templates: data ?? [] })
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createSmsTemplateSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('sms_templates')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        message_type: body.message_type,
        body: body.body,
        is_active: body.is_active ?? true,
      })
      .select(COLUMNS)
      .single()

    if (error) throwDbError(error, 'create sms template')

    return NextResponse.json({ template: data }, { status: 201 })
  }
)
