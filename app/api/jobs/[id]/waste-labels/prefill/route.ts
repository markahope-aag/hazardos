import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { LABELS_PER_SHEET } from '@/lib/pdf/waste-label-template'

interface PrefillResponse {
  contractor: {
    name: string
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  generator: string
  location: string
  label_count: number
}

/**
 * Composes the site address the way it reads on the label: street on the
 * generator's line, then city/state/zip, skipping anything we don't hold.
 */
function formatLocation(job: {
  job_address: string
  job_city: string | null
  job_state: string | null
  job_zip: string | null
}): string {
  const cityLine = [job.job_city, job.job_state, job.job_zip].filter(Boolean).join(' ')
  return [job.job_address, cityLine].filter(Boolean).join(' ')
}

// Hands the label dialog its defaults so the crew isn't retyping the
// contractor block or the site address for every container run.
export const GET = createApiHandlerWithParams(
  { requireAuth: true },
  async (_request, context, params) => {
    const jobId = params.id
    if (!jobId) throw new SecureError('VALIDATION_ERROR', 'Missing job id')

    const { supabase, profile } = context

    const [orgRes, jobRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('name, address, city, state, zip')
        .eq('id', profile.organization_id)
        .single(),
      supabase
        .from('jobs')
        .select(
          `id, job_address, job_city, job_state, job_zip,
           customer:customers!customer_id(name, first_name, last_name, company_name)`,
        )
        .eq('id', jobId)
        .eq('organization_id', profile.organization_id)
        .single(),
    ])

    if (orgRes.error || !orgRes.data) throw new SecureError('NOT_FOUND', 'Organization not found')
    if (jobRes.error || !jobRes.data) throw new SecureError('NOT_FOUND', 'Job not found')

    const org = orgRes.data
    const job = jobRes.data as unknown as {
      job_address: string
      job_city: string | null
      job_state: string | null
      job_zip: string | null
      customer: {
        name: string | null
        first_name: string | null
        last_name: string | null
        company_name: string | null
      } | null
    }

    // The generator is whoever produced the waste — the property owner or
    // responsible party, not our own company. Prefer the person's name,
    // fall back to the company, and leave it blank rather than guessing
    // if we hold neither, so the dialog surfaces it as required.
    const generator =
      [job.customer?.first_name, job.customer?.last_name].filter(Boolean).join(' ') ||
      job.customer?.name ||
      job.customer?.company_name ||
      ''

    const body: PrefillResponse = {
      contractor: {
        name: org.name,
        address: org.address,
        city: org.city,
        state: org.state,
        zip: org.zip,
      },
      generator,
      location: formatLocation(job),
      label_count: LABELS_PER_SHEET,
    }

    return NextResponse.json(body)
  },
)
