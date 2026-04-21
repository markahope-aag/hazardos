import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManifestSnapshot } from '@/types/manifests'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * Pull all the source data we need to populate a fresh manifest snapshot
 * for a job — job + customer + estimate + crew + equipment + materials.
 * Returns a fully-shaped ManifestSnapshot; the caller decides whether to
 * store it as-is or let the office manager edit before issuing.
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
      customer_id, estimate_id,
      customer:customers!customer_id(id, name, company_name, email, phone),
      estimate:estimates(id, estimate_number, total, scope_of_work),
      crew:job_crew(
        profile_id,
        role,
        is_lead,
        scheduled_start,
        scheduled_end,
        profile:profiles(id, full_name, email, role)
      ),
      equipment:job_equipment(
        equipment_name, equipment_type, quantity,
        is_rental, rental_start_date, rental_end_date, notes
      ),
      materials:job_materials(
        material_name, material_type, quantity_estimated, unit, notes
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
  const equipmentRows = Array.isArray(job.equipment) ? job.equipment : []
  const materialsRows = Array.isArray(job.materials) ? job.materials : []

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
    equipment: equipmentRows.map((e) => ({
      name: e.equipment_name,
      type: e.equipment_type ?? null,
      quantity: e.quantity ?? 1,
      is_rental: !!e.is_rental,
      rental_start_date: e.rental_start_date ?? null,
      rental_end_date: e.rental_end_date ?? null,
      notes: e.notes ?? null,
    })),
    materials: materialsRows.map((m) => ({
      name: m.material_name,
      type: m.material_type ?? null,
      quantity_estimated: m.quantity_estimated ?? null,
      unit: m.unit ?? null,
      notes: m.notes ?? null,
    })),
    extra_items: [],
  }
}
