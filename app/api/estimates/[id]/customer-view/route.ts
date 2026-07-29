import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/estimates/[id]/customer-view
 *
 * Everything the customer-facing document renders, assembled for the staff
 * preview. Deliberately mirrors what the portal endpoint returns so the two
 * views can't disagree.
 *
 * An estimate may not have a proposal yet — the preview still has to work,
 * because the question being answered ("what will they see?") is most often
 * asked before anything has been sent. Proposal-only fields come back null
 * and the document simply omits those sections, which is exactly what the
 * customer would get.
 */
export const GET = createApiHandlerWithParams(
  { requireAuth: true },
  async (_request, context, params) => {
    const estimateId = params.id
    if (!estimateId) throw new SecureError('VALIDATION_ERROR', 'Missing estimate id')

    const { supabase, profile } = context

    const { data: estimate, error } = await supabase
      .from('estimates')
      .select(
        `id, estimate_number, version, status,
         scope_of_work, estimated_duration_days,
         subtotal, markup_percent, markup_amount,
         discount_percent, discount_amount, tax_percent, tax_amount, total,
         customer:customers!customer_id(company_name, first_name, last_name, email, phone, mobile_phone, office_phone),
         site_survey:site_surveys!site_survey_id(site_address, site_city, site_state, site_zip),
         line_items:estimate_line_items(id, item_type, category, description, quantity, unit, unit_price, total_price, is_included, is_optional, sort_order)`,
      )
      .eq('id', estimateId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !estimate) throw new SecureError('NOT_FOUND', 'Estimate not found')

    const [orgRes, proposalRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single(),
      // Most recent proposal for this estimate, if one has been raised.
      supabase
        .from('proposals')
        .select(
          `proposal_number, status, cover_letter, inclusions, exclusions,
           payment_terms, terms_and_conditions, valid_until, signed_at`,
        )
        .eq('estimate_id', estimateId)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const customer = Array.isArray(estimate.customer) ? estimate.customer[0] : estimate.customer
    const siteSurvey = Array.isArray(estimate.site_survey)
      ? estimate.site_survey[0]
      : estimate.site_survey
    const proposal = proposalRes.data

    const lineItems = (estimate.line_items ?? []) as Array<{ sort_order: number }>

    return NextResponse.json({
      estimate: {
        ...estimate,
        customer: undefined,
        site_survey: siteSurvey ?? null,
        line_items: [...lineItems].sort((a, b) => a.sort_order - b.sort_order),
      },
      // The portal shows whichever phone the contact record carries; mirror
      // that fallback order so the preview isn't subtly different.
      customer: customer
        ? {
            company_name: customer.company_name,
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            phone: customer.mobile_phone || customer.office_phone || customer.phone,
          }
        : null,
      organizationName: orgRes.data?.name ?? null,
      proposal: proposal ?? null,
      // Lets the preview tell the user whether this reflects something the
      // customer can actually open, or a projection of what they'd get.
      hasProposal: !!proposal,
    })
  },
)
