import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createSurveyRevision } from '@/lib/services/survey-versioning'

const reviseBodySchema = z.object({
  revision_notes: z.string().max(2000).optional().nullable(),
}).optional()

/**
 * POST /api/site-surveys/[id]/revise
 *
 * Create a draft revision of the given survey. The new survey copies all
 * the parent's field data and starts in 'draft' state — the user picks
 * up in the wizard to update what changed. Submitting the new version
 * fires the auto-estimate flow, producing a fresh estimate chain rooted
 * on the new survey version.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: reviseBodySchema,
  },
  async (_request, context, params, body) => {
    const created = await createSurveyRevision(
      context.supabase,
      context.profile.organization_id,
      params.id,
      { revisionNotes: body?.revision_notes ?? null },
    )

    return NextResponse.json({ survey: created }, { status: 201 })
  },
)
