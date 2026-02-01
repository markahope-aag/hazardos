import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import {
  addJobDisposalSchema,
  updateJobDisposalSchema,
  deleteJobDisposalSchema,
} from '@/lib/validations/jobs'

/**
 * POST /api/jobs/[id]/disposal
 * Add a disposal record to a job
 */
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

/**
 * PATCH /api/jobs/[id]/disposal
 * Update a disposal record
 */
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

/**
 * DELETE /api/jobs/[id]/disposal
 * Delete a disposal record
 */
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
