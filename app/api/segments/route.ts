import { NextResponse } from 'next/server'
import { SegmentationService } from '@/lib/services/segmentation-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { createSegmentSchema } from '@/lib/validations/segments'

/**
 * GET /api/segments
 * List segments
 */
export const GET = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_WRITE },
  async (_request, context) => {
    const segments = await SegmentationService.list(context.profile.organization_id)
    return NextResponse.json({ segments })
  }
)

/**
 * POST /api/segments
 * Create a segment
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createSegmentSchema,
  },
  async (_request, context, body) => {
    const segment = await SegmentationService.create(
      context.profile.organization_id,
      context.user.id,
      body
    )
    return NextResponse.json({ segment })
  }
)
