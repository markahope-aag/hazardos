import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/work-orders/[id]/issue
 * Mark a draft work order as issued. Snapshot is frozen from this point
 * on — further edits are rejected. Records who issued it and when.
 */
export const POST = createApiHandlerWithParams(
  { allowedRoles: ROLES.TENANT_MANAGE },
  async (_request, context, params) => {
    const { data: workOrder } = await context.supabase
      .from('work_orders')
      .select('id, status')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (!workOrder) throw new SecureError('NOT_FOUND', 'Work order not found')
    if (workOrder.status === 'issued') {
      throw new SecureError('VALIDATION_ERROR', 'Work order is already issued.')
    }

    const { data, error } = await context.supabase
      .from('work_orders')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        issued_by: context.user.id,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throwDbError(error, 'issue work order')

    return NextResponse.json({ work_order: data })
  },
)
