import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addChangeOrderSchema, changeOrderActionSchema } from '@/lib/validations/jobs'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/jobs/[id]/change-orders
 * Add a change order to a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addChangeOrderSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, params, body) => {
    const changeOrder = await JobsService.addChangeOrder(params.id, body)
    return NextResponse.json(changeOrder, { status: 201 })
  }
)

/**
 * PATCH /api/jobs/[id]/change-orders
 * Approve or reject a change order
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: changeOrderActionSchema,
    // A technician could previously reach this and mark a change order
    // approved. The rollup that follows writes to jobs, which RLS then
    // refused for them, so the change order went to approved while the job
    // totals silently stayed behind. Both halves are closed by gating here.
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, _context, _params, body) => {
    const changeOrder = body.action === 'approve'
      ? await JobsService.approveChangeOrder(body.change_order_id)
      : await JobsService.rejectChangeOrder(body.change_order_id)
    return NextResponse.json(changeOrder)
  }
)
