import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addChangeOrderSchema, changeOrderActionSchema } from '@/lib/validations/jobs'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addChangeOrderSchema,
  },
  async (_request, _context, params, body) => {
    const changeOrder = await JobsService.addChangeOrder(params.id, body)
    return NextResponse.json(changeOrder, { status: 201 })
  }
)

export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: changeOrderActionSchema,
  },
  async (_request, _context, _params, body) => {
    const changeOrder = body.action === 'approve'
      ? await JobsService.approveChangeOrder(body.change_order_id)
      : await JobsService.rejectChangeOrder(body.change_order_id)
    return NextResponse.json(changeOrder)
  }
)
