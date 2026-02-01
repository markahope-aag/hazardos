import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { addJobDisposalSchema, updateJobDisposalSchema, deleteJobDisposalSchema } from '@/lib/validations/jobs'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: addJobDisposalSchema,
  },
  async (_request, _context, params, body) => {
    const disposal = await JobsService.addDisposal(params.id, body)
    return NextResponse.json(disposal, { status: 201 })
  }
)

export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateJobDisposalSchema,
  },
  async (_request, _context, _params, body) => {
    const { disposal_id, ...updates } = body
    const disposal = await JobsService.updateDisposal(disposal_id, updates)
    return NextResponse.json(disposal)
  }
)

export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: deleteJobDisposalSchema,
  },
  async (_request, _context, _params, body) => {
    await JobsService.deleteDisposal(body.disposal_id)
    return NextResponse.json({ success: true })
  }
)
