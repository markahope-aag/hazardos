import { NextResponse } from 'next/server'
import { FollowUpsService } from '@/lib/services/follow-ups-service'
import { createDraftEstimateFromSurvey } from '@/lib/services/estimate-creator'
import { createStandaloneEstimate } from '@/lib/services/standalone-estimate'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { estimateListQuerySchema, createEstimateBodySchema } from '@/lib/validations/estimates'

/**
 * GET /api/estimates
 * List all estimates for the current organization
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: estimateListQuerySchema,
  },
  async (_request, context, _body, query) => {
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0

    // Build query
    let dbQuery = context.supabase
      .from('estimates')
      .select(`
        *,
        site_survey:site_surveys(id, job_name, site_address, site_city, site_state, site_zip, hazard_type, status),
        customer:customers(id, company_name, name, first_name, last_name, email, phone),
        created_by_user:profiles!created_by(id, first_name, last_name, email),
        jobs:jobs!estimate_id(id, job_number, status),
        proposals(id, sent_at, status)
      `, { count: 'exact' })
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.survey_id) {
      dbQuery = dbQuery.eq('site_survey_id', query.survey_id)
    }
    if (query.customer_id) {
      dbQuery = dbQuery.eq('customer_id', query.customer_id)
    }

    const { data, error, count } = await dbQuery

    if (error) {
      throw error
    }

    // Fetch most recent activity per estimate in one round-trip. We grab all
    // activity_log rows for the visible estimates and take the first per id;
    // the query is ordered DESC so the first hit is the most recent.
    const estimateIds = (data || []).map(e => e.id)
    const lastActivityById = new Map<string, string>()
    if (estimateIds.length > 0) {
      const { data: activityRows } = await context.supabase
        .from('activity_log')
        .select('entity_id, created_at')
        .eq('entity_type', 'estimate')
        .in('entity_id', estimateIds)
        .order('created_at', { ascending: false })

      for (const row of activityRows || []) {
        if (!lastActivityById.has(row.entity_id)) {
          lastActivityById.set(row.entity_id, row.created_at)
        }
      }
    }

    // Batch-load the next pending follow-up for each estimate.
    const nextFollowUpById = await FollowUpsService.getNextPendingForEntities(
      'estimate',
      estimateIds
    )

    // Compute chain_total per row so the UI can render "v2 of 3" without
    // a follow-up round trip. We need MAX(version) per estimate_root_id
    // across the org — even if the page-of-50 only includes some versions
    // of each chain, the total should reflect the full chain.
    const rootIds = Array.from(
      new Set(
        (data || [])
          .map((e) => e.estimate_root_id as string | null)
          .filter((id): id is string => !!id),
      ),
    )
    const chainTotalByRoot = new Map<string, number>()
    if (rootIds.length > 0) {
      const { data: chainRows } = await context.supabase
        .from('estimates')
        .select('estimate_root_id, version')
        .eq('organization_id', context.profile.organization_id)
        .in('estimate_root_id', rootIds)

      for (const row of chainRows || []) {
        const root = row.estimate_root_id as string
        const v = row.version as number
        const cur = chainTotalByRoot.get(root) ?? 0
        if (v > cur) chainTotalByRoot.set(root, v)
      }
    }

    // Transform relations
    const transformed = (data || []).map(estimate => {
      const loggedActivity = lastActivityById.get(estimate.id) ?? null
      const updatedAt = estimate.updated_at ?? null
      const lastActivityAt =
        loggedActivity && updatedAt
          ? loggedActivity > updatedAt ? loggedActivity : updatedAt
          : loggedActivity ?? updatedAt

      const chainTotal =
        (estimate.estimate_root_id && chainTotalByRoot.get(estimate.estimate_root_id as string)) ||
        (estimate.version as number) || 1

      return {
        ...estimate,
        site_survey: Array.isArray(estimate.site_survey) ? estimate.site_survey[0] : estimate.site_survey,
        customer: Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer,
        created_by_user: Array.isArray(estimate.created_by_user) ? estimate.created_by_user[0] : estimate.created_by_user,
        jobs: Array.isArray(estimate.jobs) ? estimate.jobs : [],
        proposals: Array.isArray(estimate.proposals) ? estimate.proposals : [],
        last_activity_at: lastActivityAt,
        next_follow_up: nextFollowUpById.get(estimate.id) ?? null,
        chain_total: chainTotal,
      }
    })

    // When include=latest (default), return only the most-recent version
    // per estimate chain so the user isn't drowning in superseded drafts.
    const include = query.include ?? 'latest'
    const estimates = include === 'latest'
      ? transformed.filter((e) => e.version === e.chain_total)
      : transformed

    return NextResponse.json({
      estimates,
      total: count || 0,
      limit,
      offset,
    })
  }
)

/**
 * POST /api/estimates
 *
 * Two modes:
 * - **From a survey:** body has `site_survey_id`. Loads pricing data,
 *   runs the calculator, inserts the estimate + line items, and bumps
 *   the survey status to 'estimated'.
 * - **Standalone:** body has `project_name` (and `customer_id`) but no
 *   `site_survey_id`. Inserts an empty draft estimate; the user fills
 *   in line items via the existing /api/estimates/[id]/line-items route.
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: createEstimateBodySchema,
  },
  async (_request, context, body) => {
    if ('site_survey_id' in body) {
      const { estimate } = await createDraftEstimateFromSurvey(context.supabase, {
        siteSurveyId: body.site_survey_id,
        organizationId: context.profile.organization_id,
        userId: context.user.id,
        customerId: body.customer_id,
        projectName: body.project_name,
        projectDescription: body.project_description,
        scopeOfWork: body.scope_of_work,
        estimatedDurationDays: body.estimated_duration_days,
        estimatedStartDate: body.estimated_start_date,
        estimatedEndDate: body.estimated_end_date,
        validUntil: body.valid_until,
        markupPercent: body.markup_percent,
        internalNotes: body.internal_notes,
      })

      // The manual "Generate Estimate" flow promotes the survey out of
      // submitted/reviewed once an estimate has been generated. The auto-
      // create-on-submit flow leaves the survey at 'submitted'.
      await context.supabase
        .from('site_surveys')
        .update({ status: 'estimated' })
        .eq('id', body.site_survey_id)

      return NextResponse.json({ estimate }, { status: 201 })
    }

    // Standalone path
    const created = await createStandaloneEstimate(context.supabase, {
      organizationId: context.profile.organization_id,
      userId: context.user.id,
      customerId: body.customer_id,
      projectName: body.project_name,
      projectDescription: body.project_description ?? null,
      scopeOfWork: body.scope_of_work ?? null,
      estimatedDurationDays: body.estimated_duration_days ?? null,
      estimatedStartDate: body.estimated_start_date ?? null,
      estimatedEndDate: body.estimated_end_date ?? null,
      validUntil: body.valid_until ?? null,
      markupPercent: body.markup_percent ?? null,
      internalNotes: body.internal_notes ?? null,
    })

    return NextResponse.json({ estimate: { id: created.id, estimate_number: created.estimate_number } }, { status: 201 })
  }
)
