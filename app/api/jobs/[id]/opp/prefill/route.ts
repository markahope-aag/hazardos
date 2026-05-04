import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import type { OppDefaults } from '@/types/database'

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
           job_address, job_city, property_id,
           customer:customers!customer_id(id, name, first_name, last_name, mobile_phone, office_phone, phone, company_name)`,
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

    // Seed the description field with whatever we know about the job —
    // hazards and containment are the most common things the inspector
    // wants to see at a glance.
    const descParts: string[] = []
    if (job.hazard_types?.length) {
      descParts.push(`Hazards: ${job.hazard_types.join(', ')}.`)
    }
    if (job.containment_level) {
      descParts.push(`Containment level: ${job.containment_level.replace(/_/g, ' ')}.`)
    }

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
      description: descParts.join(' '),
      defaults: oppDefaults,
    }

    return NextResponse.json(body)
  },
)
