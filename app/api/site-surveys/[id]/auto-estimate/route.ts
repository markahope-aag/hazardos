import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createDraftEstimateFromSurvey } from '@/lib/services/estimate-creator'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

/**
 * POST /api/site-surveys/[id]/auto-estimate
 *
 * Idempotent: if a draft estimate already exists for this survey, returns
 * it instead of creating a duplicate. Otherwise creates a draft estimate
 * using the org's pricing data. Does not change the survey's status — the
 * caller (typically the mobile submit flow) has already set it to
 * 'submitted', and we want the estimator to review the survey before the
 * status moves on.
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
      const { estimate } = await createDraftEstimateFromSurvey(context.supabase, {
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
