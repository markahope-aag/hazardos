import { NextResponse } from 'next/server'
import { SegmentationService } from '@/lib/services/segmentation-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateSegmentSchema } from '@/lib/validations/segments'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/segments/[id]
 * Get a segment
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const segment = await SegmentationService.get(params.id)

    if (!segment) {
      throw new SecureError('NOT_FOUND', 'Segment not found')
    }

    return NextResponse.json({ segment })
  }
)

/**
 * PUT /api/segments/[id]
 * Update a segment
 */
export const PUT = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateSegmentSchema,
  },
  async (_request, _context, params, body) => {
    const segment = await SegmentationService.update(params.id, body)
    return NextResponse.json({ segment })
  }
)

/**
 * DELETE /api/segments/[id]
 * Delete a segment
 */
export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await SegmentationService.delete(params.id)
    return NextResponse.json({ success: true })
  }
)
