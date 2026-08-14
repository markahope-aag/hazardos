import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { updateEmailTemplateSchema } from '@/lib/validations/email-templates'

const COLUMNS = 'id, name, subject, body, is_active, is_system, created_at, updated_at'

function templateIdFrom(pathname: string): string {
  return pathname.split('/').filter(Boolean).pop()!
}

export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateEmailTemplateSchema,
  },
  async (request, context, body) => {
    const id = templateIdFrom(request.nextUrl.pathname)

    const { data, error } = await context.supabase
      .from('email_templates')
      .update(body)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select(COLUMNS)
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        throw new SecureError('VALIDATION_ERROR', 'A template with that name already exists')
      }
      throwDbError(error, 'update email template')
    }
    if (!data) throw new SecureError('NOT_FOUND', 'Template not found')

    return NextResponse.json({ template: data })
  }
)

/**
 * DELETE /api/email-templates/:id
 *
 * Refuses while an automation step still uses the template. The foreign key
 * would null the reference and the step would silently become a manual task,
 * which looks identical to a step someone never finished configuring. Better
 * to say which chains are in the way.
 */
export const DELETE = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (request, context) => {
    const id = templateIdFrom(request.nextUrl.pathname)

    const { data: usedBy } = await context.supabase
      .from('activity_process_steps')
      .select('process:activity_processes!process_id(name)')
      .eq('email_template_id', id)
      .eq('organization_id', context.profile.organization_id)

    if (usedBy && usedBy.length > 0) {
      const names = [
        ...new Set(
          usedBy
            .map((row) => {
              const p = (row as { process?: { name?: string } | { name?: string }[] }).process
              return Array.isArray(p) ? p[0]?.name : p?.name
            })
            .filter(Boolean) as string[]
        ),
      ]
      throw new SecureError(
        'VALIDATION_ERROR',
        names.length
          ? `Still used by: ${names.join(', ')}. Change those steps first.`
          : 'Still used by an automation step. Change that step first.'
      )
    }

    const { error } = await context.supabase
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throwDbError(error, 'delete email template')

    return NextResponse.json({ success: true })
  }
)
