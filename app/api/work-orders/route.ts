import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createWorkOrderSchema } from '@/lib/validations/work-orders'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import { buildWorkOrderSnapshotFromJob } from '@/lib/services/work-orders-service'

/**
 * GET /api/work-orders
 * List work orders for the caller's organization, newest first.
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('work_orders')
      .select(`
        id, work_order_number, status, notes, issued_at, created_at, updated_at,
        job:jobs!job_id(id, job_number, name, job_address, job_city, job_state, scheduled_start_date, customer:customers!customer_id(id, name, company_name))
      `)
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) throwDbError(error, 'list work orders')

    return NextResponse.json({ work_orders: data })
  },
)

/**
 * POST /api/work-orders
 * Generate a new work order from a job. The snapshot is pulled from the
 * job + estimate + customer + crew + equipment + materials at
 * generate-time. The office manager can edit before calling issue.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    // Estimators also generate work orders in the wild — TENANT_MANAGE
    // excluded them and left estimator accounts with a generic
    // "Forbidden" that read as "the system is broken."
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createWorkOrderSchema,
  },
  async (_request, context, body) => {
    // Snapshot first — if this fails (missing job, RLS, etc.) we haven't
    // created a stub work order that would need cleaning up.
    const snapshot = await buildWorkOrderSnapshotFromJob(
      context.supabase,
      context.profile.organization_id,
      body.job_id,
    )

    const { data: numberRow, error: numberError } = await context.supabase.rpc(
      'generate_work_order_number',
      {
        p_organization_id: context.profile.organization_id,
        p_job_id: body.job_id,
      },
    )
    if (numberError) {
      throw new SecureError('BAD_REQUEST', 'Could not generate work order number')
    }

    const { data: workOrder, error: insertError } = await context.supabase
      .from('work_orders')
      .insert({
        organization_id: context.profile.organization_id,
        job_id: body.job_id,
        work_order_number: numberRow as unknown as string,
        status: 'draft',
        snapshot,
        notes: body.notes ?? null,
        created_by: context.user.id,
      })
      .select()
      .single()

    if (insertError) throwDbError(insertError, 'create work order')

    return NextResponse.json({ work_order: workOrder }, { status: 201 })
  },
)
