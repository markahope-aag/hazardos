import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManifestSnapshot } from '@/types/manifests'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * Pull all the source data we need to populate a fresh manifest snapshot
 * for a job. Crew comes from job_crew (who's actually assigned).
 * Materials, equipment, and the "additional items" list come from the
 * approved estimate's line items — that's the authoritative "here's
 * what this job requires" source. job_materials / job_equipment are
 * reserved for post-job actuals tracking.
 */
export async function buildManifestSnapshotFromJob(
  supabase: SupabaseClient,
  organizationId: string,
  jobId: string,
): Promise<ManifestSnapshot> {
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id, job_number, name, scheduled_start_date, scheduled_start_time,
      scheduled_end_date, estimated_duration_hours, hazard_types,
      job_address, job_city, job_state, job_zip,
      access_notes, special_instructions,
      gate_code, lockbox_code, contact_onsite_name, contact_onsite_phone,
      customer_id, estimate_id, site_survey_id,
      customer:customers!customer_id(id, name, company_name, email, phone),
      estimate:estimates(id, estimate_number, total, scope_of_work),
      crew:job_crew(
        profile_id,
        role,
        is_lead,
        scheduled_start,
        scheduled_end,
        profile:profiles(id, full_name, email, role)
      )
    `)
    .eq('id', jobId)
    .eq('organization_id', organizationId)
    .single()

  if (jobError || !job) {
    throw new SecureError('NOT_FOUND', 'Job not found')
  }

  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  const estimate = Array.isArray(job.estimate) ? job.estimate[0] : job.estimate
  const crewRows = Array.isArray(job.crew) ? job.crew : []

  // Fetch estimate line items separately — these drive materials,
  // equipment, and the additional-items list on the manifest.
  // Excluded items are left out so the crew doesn't chase things the
  // office decided not to do.
  let lineItems: Array<{
    item_type: string | null
    description: string | null
    quantity: number | null
    unit: string | null
    notes: string | null
    is_included?: boolean
  }> = []
  if (job.estimate_id) {
    const { data: items } = await supabase
      .from('estimate_line_items')
      .select('item_type, description, quantity, unit, notes, is_included, sort_order')
      .eq('estimate_id', job.estimate_id)
      .order('sort_order', { ascending: true })
    lineItems = (items || []).filter((li) => li.is_included !== false)
  }

  const materials = lineItems
    .filter((li) => li.item_type === 'material')
    .map((li) => ({
      name: li.description || 'Material',
      type: null as string | null,
      quantity_estimated: li.quantity ?? null,
      unit: li.unit ?? null,
      notes: li.notes ?? null,
    }))

  const equipment = lineItems
    .filter((li) => li.item_type === 'equipment')
    .map((li) => ({
      name: li.description || 'Equipment',
      type: null as string | null,
      quantity: li.quantity ?? 1,
      is_rental: false,
      rental_start_date: null as string | null,
      rental_end_date: null as string | null,
      notes: li.notes ?? null,
    }))

  // Everything else the estimate budgeted for (disposal, travel, permits,
  // testing, other) shows up as additional items the crew needs to know
  // about. Labor is intentionally omitted — crew assignments handle that.
  const EXTRA_TYPES = new Set(['disposal', 'travel', 'permit', 'testing', 'other'])
  const extra_items = lineItems
    .filter((li) => li.item_type && EXTRA_TYPES.has(li.item_type))
    .map((li) => ({
      label: li.description || (li.item_type as string),
      detail:
        li.quantity != null
          ? `${li.quantity}${li.unit ? ' ' + li.unit : ''}${li.notes ? ' — ' + li.notes : ''}`
          : li.notes ?? null,
    }))

  return {
    version: 1,
    site: {
      address: job.job_address ?? null,
      city: job.job_city ?? null,
      state: job.job_state ?? null,
      zip: job.job_zip ?? null,
      gate_code: job.gate_code ?? null,
      lockbox_code: job.lockbox_code ?? null,
      contact_onsite_name: job.contact_onsite_name ?? null,
      contact_onsite_phone: job.contact_onsite_phone ?? null,
    },
    job: {
      id: job.id,
      job_number: job.job_number,
      name: job.name ?? null,
      scheduled_start_date: job.scheduled_start_date ?? null,
      scheduled_start_time: job.scheduled_start_time ?? null,
      scheduled_end_date: job.scheduled_end_date ?? null,
      estimated_duration_hours: job.estimated_duration_hours ?? null,
      hazard_types: Array.isArray(job.hazard_types) ? job.hazard_types : [],
      access_notes: job.access_notes ?? null,
      special_instructions: job.special_instructions ?? null,
      site_survey_id: job.site_survey_id ?? null,
    },
    customer: customer
      ? {
          id: customer.id ?? null,
          name: customer.name ?? null,
          company_name: customer.company_name ?? null,
          email: customer.email ?? null,
          phone: customer.phone ?? null,
        }
      : null,
    estimate: estimate
      ? {
          id: estimate.id ?? null,
          estimate_number: estimate.estimate_number ?? null,
          total: estimate.total ?? null,
          scope_of_work: estimate.scope_of_work ?? null,
        }
      : null,
    crew: crewRows.map((c) => {
      const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile
      return {
        profile_id: c.profile_id ?? null,
        name: profile?.full_name || profile?.email || 'Crew member',
        role: c.role ?? profile?.role ?? null,
        is_lead: !!c.is_lead,
        scheduled_start: c.scheduled_start ?? null,
        scheduled_end: c.scheduled_end ?? null,
      }
    }),
    equipment,
    materials,
    extra_items,
  }
}
