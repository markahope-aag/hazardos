import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/customers/[id]/archive
 *
 * "Can you archive it maybe?" — when a contact moves away, the office wants
 * them out of the working list without losing the record.
 *
 * Archiving rather than deleting is also the only safe option: customers has
 * eight cascading foreign keys, including asbestos disposal manifests that are
 * retention-bound by law (P1-5 of the July audit). A delete here is not a
 * tidy-up, it is destruction of legally-required records.
 *
 * Reversible — POST { archived: false } restores the contact to active.
 */
const bodySchema = z.object({
  archived: z.boolean().default(true),
  reason: z.string().max(500).optional(),
})

export const POST = createApiHandlerWithParams(
  {
    bodySchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, context, params, body) => {
    const { supabase, profile, user } = context

    const { data: contact, error: readError } = await supabase
      .from('customers')
      .select('id, name, contact_status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (readError || !contact) throw new SecureError('NOT_FOUND', 'Contact not found')

    const { data, error } = await supabase
      .from('customers')
      .update(
        body.archived
          ? {
              contact_status: 'archived',
              archived_at: new Date().toISOString(),
              archived_by: user.id,
              archive_reason: body.reason ?? null,
            }
          : {
              contact_status: 'active',
              archived_at: null,
              archived_by: null,
              archive_reason: null,
            },
      )
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select('id, name, contact_status, archived_at')
      .single()

    if (error || !data) {
      context.log.error({ error }, 'Failed to change contact archive state')
      throw new Error('Could not update the contact')
    }

    return NextResponse.json(data)
  },
)
