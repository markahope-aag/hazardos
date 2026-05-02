import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createEstimateRevision } from '@/lib/services/estimate-versioning'

const reviseBodySchema = z.object({
  revision_notes: z.string().max(2000).optional().nullable(),
}).optional()

/**
 * POST /api/estimates/[id]/revise
 *
 * Create a draft revision of the given estimate. Used when the customer
 * asks to change scope/pricing on an existing estimate without redoing
 * the survey. Copies all line items so the user can edit instead of
 * rebuilding from scratch.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: reviseBodySchema,
  },
  async (_request, context, params, body) => {
    const created = await createEstimateRevision(
      context.supabase,
      context.profile.organization_id,
      context.user.id,
      params.id,
      { revisionNotes: body?.revision_notes ?? null },
    )

    return NextResponse.json({ estimate: { id: created.id } }, { status: 201 })
  },
)
