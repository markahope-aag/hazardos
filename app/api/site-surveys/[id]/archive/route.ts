import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/site-surveys/[id]/archive
 *
 * A site visit that produced no estimate. From the call: "I don't want it to
 * die, but I don't want it showing up saying there's a survey here you need
 * to address." Bob's word for it was archive; Gina's was file it.
 *
 * The survey stays attached to the property — that history is the point —
 * it just stops counting as outstanding work.
 *
 * Field-tier: the crew that attended and found nothing to quote is the crew
 * that knows it should be filed. Reversible via { archived: false }.
 */
const bodySchema = z.object({
  archived: z.boolean().default(true),
  reason: z.string().max(500).optional(),
})

export const POST = createApiHandlerWithParams(
  {
    bodySchema,
    allowedRoles: ROLES.TENANT_FIELD,
  },
  async (_request, context, params, body) => {
    const { supabase, profile, user } = context

    const { data: survey, error: readError } = await supabase
      .from('site_surveys')
      .select('id, job_name, status')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (readError || !survey) throw new SecureError('NOT_FOUND', 'Survey not found')

    // Restoring puts it back to draft rather than whatever it was before —
    // the previous status isn't recorded, and draft is the state that
    // correctly reads as "needs attention again".
    const { data, error } = await supabase
      .from('site_surveys')
      .update(
        body.archived
          ? {
              status: 'archived',
              archived_at: new Date().toISOString(),
              archived_by: user.id,
              archive_reason: body.reason ?? 'Visited, no estimate needed',
            }
          : {
              status: 'draft',
              archived_at: null,
              archived_by: null,
              archive_reason: null,
            },
      )
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select('id, job_name, status, archived_at, archive_reason')
      .single()

    if (error || !data) {
      context.log.error({ error }, 'Failed to change survey archive state')
      throw new Error('Could not update the survey')
    }

    return NextResponse.json(data)
  },
)
