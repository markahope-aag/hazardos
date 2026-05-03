import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createDraftEstimateFromSurvey } from '@/lib/services/estimate-creator'
import { ApprovalService } from '@/lib/services/approval-service'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { z } from 'zod'

/**
 * POST /api/site-surveys/[id]/auto-estimate
 *
 * Idempotent: if an estimate already exists for this survey, returns it
 * instead of creating a duplicate.
 *
 * On a fresh creation, the new estimate is immediately submitted for
 * approval (status='pending_approval', approval_requests row created,
 * office manager notified). 'pending_approval' is the natural starting
 * point — the calculator output is the office manager's worksheet, not
 * a finished product. They review/edit/finalize it before passing it
 * to the owner. 'draft' is reserved for the standalone-estimate and
 * estimate-revision flows where a human is mid-typing.
 *
 * If submitting for approval fails, we keep the estimate as draft and
 * log a warning so the office manager can still pick it up via the
 * regular "Submit for Approval" button.
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

    let estimate
    try {
      const result = await createDraftEstimateFromSurvey(context.supabase, {
        siteSurveyId: surveyId,
        organizationId: context.profile.organization_id,
        userId: context.user.id,
      })
      estimate = result.estimate
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

    // Promote to pending_approval via the same path the manual "Submit
    // for Approval" button uses — that creates the approval_requests
    // row and notifies admins. Best-effort: a failure here leaves the
    // estimate as draft, which the office manager can recover from.
    try {
      await ApprovalService.submitEstimateForApproval(estimate.id as string)
      const updated = { ...estimate, status: 'pending_approval' }
      return NextResponse.json({ estimate: updated, created: true }, { status: 201 })
    } catch (error) {
      context.log.warn(
        { err: error, estimateId: estimate.id, surveyId },
        'Auto-estimate created but submit-for-approval failed; leaving as draft',
      )
      return NextResponse.json({ estimate, created: true }, { status: 201 })
    }
  },
)
