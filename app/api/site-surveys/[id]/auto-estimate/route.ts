import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createEstimateFromSurvey } from '@/lib/services/estimate-creator'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

/**
 * POST /api/site-surveys/[id]/auto-estimate
 *
 * Idempotent: if an estimate already exists for this survey, returns it
 * instead of creating a duplicate.
 *
 * The new estimate is created directly in `pending_approval` — the
 * calculator output is the office manager's worksheet, not a finished
 * product. `draft` is reserved for the standalone-estimate and
 * estimate-revision flows where a human is mid-typing. The creator also
 * inserts the approval_requests row inline; if that side-effect fails
 * the estimate is still in the right status and the office manager can
 * pick it up from the estimates list directly.
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: z.object({}).optional(),
  },
  async (_request, context, params) => {
    const surveyId = params.id

    const { data: existing, error: existingError } = await context.supabase
      .from('estimates')
      .select('*')
      .eq('site_survey_id', surveyId)
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    if (existing) {
      return NextResponse.json({ estimate: existing, created: false })
    }

    try {
      const { estimate } = await createEstimateFromSurvey(context.supabase, {
        siteSurveyId: surveyId,
        organizationId: context.profile.organization_id,
        userId: context.user.id,
      })
      return NextResponse.json({ estimate, created: true }, { status: 201 })
    } catch (error) {
      if (error instanceof SecureError) {
        throw error
      }
      context.log.error(
        { err: error, surveyId },
        'Failed to auto-create estimate from submitted survey',
      )
      throw error
    }
  },
)
