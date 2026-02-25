import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const DELETE = createApiHandlerWithParams(
  {
    allowedRoles: ['admin', 'tenant_owner'],
  },
  async (_request, context, params) => {
    const { id } = params

    // Verify invitation belongs to this org
    const { data: invitation, error: fetchError } = await context.supabase
      .from('tenant_invitations')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (fetchError || !invitation) {
      throw new SecureError('NOT_FOUND', 'Invitation not found')
    }

    const { error } = await context.supabase
      .from('tenant_invitations')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  }
)
