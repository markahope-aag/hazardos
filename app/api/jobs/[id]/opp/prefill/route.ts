import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import type { OppDefaults } from '@/types/database'
import {
  buildOppProjectDescription,
  type OppDescriptionSource,
  type OppLineItem,
  type OppSurveyQuantities,
} from '@/lib/services/opp-description'

interface EstimateSummary {
  id: string
  estimate_number: string | null
  scope_of_work: string | null
  project_description: string | null
}

interface PrefillResponse {
  company: {
    name: string
    license_number: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    contact_name: string | null
    phone: string | null
  }
  property: {
    name: string
    address: string
    city: string | null
    contact_name: string | null
    phone: string | null
  }
  schedule: {
    start_date: string | null
    end_date: string | null
    suggested_shift: 'am' | 'pm' | 'night' | null
  }
  description: string
  // Which record the description came from, so the wizard can tell the
  // office whether it is looking at proposal text or a generated stub.
  description_source: OppDescriptionSource
  description_estimate_number: string | null
  defaults: OppDefaults
}

// Hands the OPP wizard everything it needs to pre-fill its form so the
// office isn't retyping company info, project info, or boilerplate
// protective-measures text per job.
export const GET = createApiHandlerWithParams(
  { requireAuth: true },
  async (_request, context, params) => {
    const jobId = params.id
    if (!jobId) throw new SecureError('VALIDATION_ERROR', 'Missing job id')

    const { supabase, profile, user } = context

    const [orgRes, jobRes, profileRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, license_number, address, city, state, zip, phone, opp_defaults')
        .eq('id', profile.organization_id)
        .single(),
      supabase
        .from('jobs')
        .select(
          `id, name, status, scheduled_start_date, scheduled_end_date,
           scheduled_start_time, containment_level, hazard_types,
           job_address, job_city, property_id, estimate_id, site_survey_id,
           customer:customers!customer_id(id, name, first_name, last_name, mobile_phone, office_phone, phone, company_name),
           estimate:estimates(id, estimate_number, scope_of_work, project_description)`,
        )
        .eq('id', jobId)
        .eq('organization_id', profile.organization_id)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, first_name, last_name, phone')
        .eq('id', user.id)
        .single(),
    ])

    if (orgRes.error || !orgRes.data) throw new SecureError('NOT_FOUND', 'Organization not found')
    if (jobRes.error || !jobRes.data) throw new SecureError('NOT_FOUND', 'Job not found')

    const org = orgRes.data
    const job = jobRes.data as unknown as {
      name: string | null
      scheduled_start_date: string | null
      scheduled_end_date: string | null
      scheduled_start_time: string | null
      containment_level: string | null
      hazard_types: string[] | null
      job_address: string
      job_city: string | null
      property_id: string | null
      estimate_id: string | null
      site_survey_id: string | null
      estimate: EstimateSummary | EstimateSummary[] | null
      customer: {
        name: string | null
        first_name: string | null
        last_name: string | null
        mobile_phone: string | null
        office_phone: string | null
        phone: string | null
        company_name: string | null
      } | null
    }
    const me = profileRes.data

    let propertyName = job.name || ''
    if (!propertyName && job.customer) {
      propertyName = job.customer.company_name || job.customer.name || ''
    }

    const customerContactName =
      [job.customer?.first_name, job.customer?.last_name].filter(Boolean).join(' ') ||
      job.customer?.name ||
      job.customer?.company_name ||
      null
    const customerPhone =
      job.customer?.mobile_phone ||
      job.customer?.office_phone ||
      job.customer?.phone ||
      null

    let suggestedShift: 'am' | 'pm' | 'night' | null = null
    if (job.scheduled_start_time) {
      const hour = Number(job.scheduled_start_time.slice(0, 2))
      if (!Number.isNaN(hour)) {
        if (hour < 12) suggestedShift = 'am'
        else if (hour < 18) suggestedShift = 'pm'
        else suggestedShift = 'night'
      }
    }

    const meName =
      me?.full_name ||
      [me?.first_name, me?.last_name].filter(Boolean).join(' ') ||
      null

    // The DHS form asks for type AND amount of material. The proposal is
    // where that wording already exists, so pull the estimate's scope of
    // work first and fall back through line items and survey quantities
    // before resorting to a hazards-only stub.
    const estimate = Array.isArray(job.estimate) ? job.estimate[0] : job.estimate

    const [lineItemsRes, surveyRes] = await Promise.all([
      job.estimate_id
        ? supabase
            .from('estimate_line_items')
            .select('item_type, description, quantity, unit, notes, is_included')
            .eq('estimate_id', job.estimate_id)
            .order('sort_order', { ascending: true })
        : Promise.resolve({ data: null }),
      job.site_survey_id
        ? supabase
            .from('site_surveys')
            .select('material_type, hazard_subtype, area_sqft, linear_ft, volume_cuft')
            .eq('id', job.site_survey_id)
            .eq('organization_id', profile.organization_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const description = buildOppProjectDescription({
      estimateScopeOfWork: estimate?.scope_of_work ?? null,
      estimateProjectDescription: estimate?.project_description ?? null,
      lineItems: (lineItemsRes.data as OppLineItem[] | null) ?? null,
      survey: (surveyRes.data as OppSurveyQuantities | null) ?? null,
      hazardTypes: job.hazard_types,
      containmentLevel: job.containment_level,
    })

    const oppDefaults = (org.opp_defaults || {}) as OppDefaults

    const body: PrefillResponse = {
      company: {
        name: org.name,
        license_number: org.license_number,
        address: org.address,
        city: org.city,
        state: org.state,
        zip: org.zip,
        contact_name: meName,
        phone: org.phone,
      },
      property: {
        name: propertyName,
        address: job.job_address,
        city: job.job_city,
        contact_name: customerContactName,
        phone: customerPhone,
      },
      schedule: {
        start_date: job.scheduled_start_date,
        end_date: job.scheduled_end_date,
        suggested_shift: suggestedShift,
      },
      description: description.text,
      description_source: description.source,
      description_estimate_number: estimate?.estimate_number ?? null,
      defaults: oppDefaults,
    }

    return NextResponse.json(body)
  },
)
