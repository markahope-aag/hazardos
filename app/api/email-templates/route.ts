import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createEmailTemplateSchema } from '@/lib/validations/email-templates'

const COLUMNS = 'id, name, subject, body, is_active, is_system, created_at, updated_at'

/**
 * GET /api/email-templates
 *
 * Returns inactive templates too, unlike the vocabulary endpoint. This is the
 * management view, and a template you deactivated is the one you are most
 * likely to be looking for.
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('email_templates')
      .select(COLUMNS)
      .eq('organization_id', context.profile.organization_id)
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list email templates')

    return NextResponse.json({ templates: data ?? [] })
  }
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createEmailTemplateSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('email_templates')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        subject: body.subject,
        body: body.body,
        is_active: body.is_active ?? true,
      })
      .select(COLUMNS)
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'A template with that name already exists')
      }
      throwDbError(error, 'create email template')
    }

    return NextResponse.json({ template: data }, { status: 201 })
  }
)
