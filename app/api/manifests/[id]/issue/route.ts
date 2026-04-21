import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/manifests/[id]/issue
 * Mark a draft manifest as issued. Snapshot is frozen from this point
 * on — further edits are rejected. Records who issued it and when.
 */
export const POST = createApiHandlerWithParams(
  { allowedRoles: ROLES.TENANT_MANAGE },
  async (_request, context, params) => {
    const { data: manifest } = await context.supabase
      .from('manifests')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!manifest) throw new SecureError('NOT_FOUND', 'Manifest not found')
    if (manifest.status === 'issued') {
      throw new SecureError('VALIDATION_ERROR', 'Manifest is already issued.')
    }

    const { data, error } = await context.supabase
      .from('manifests')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_by: context.user.id,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throwDbError(error, 'issue manifest')

    return NextResponse.json({ manifest: data })
  },
)
