/**
 * Manifest snapshot schema.
 * Versioned via the `version` field so future shape changes don't break
 * records written with an older layout. Consumers should check `version`
 * before reading fields that may not have existed yet.
 */
export interface ManifestSnapshot {
  version: 1

  site: {
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    gate_code: string | null
    lockbox_code: string | null
    contact_onsite_name: string | null
    contact_onsite_phone: string | null
  }

  job: {
    id: string
    job_number: string
    name: string | null
    scheduled_start_date: string | null
    scheduled_start_time: string | null
    scheduled_end_date: string | null
    estimated_duration_hours: number | null
    hazard_types: string[]
    access_notes: string | null
    special_instructions: string | null
    // ID of the source site survey, when the job was generated from one.
    // Used to surface the survey's photos and videos on the manifest so
    // the field team has site context on the way to the job.
    site_survey_id: string | null
  }

  customer: {
    id: string | null
    name: string | null
    company_name: string | null
    email: string | null
    phone: string | null
  } | null

  estimate: {
    id: string | null
    estimate_number: string | null
    total: number | null
    scope_of_work: string | null
  } | null

  crew: Array<{
    profile_id: string | null
    name: string
    role: string | null
    is_lead: boolean
    scheduled_start: string | null
    scheduled_end: string | null
  }>

  equipment: Array<{
    name: string
    type: string | null
    quantity: number
    is_rental: boolean
    rental_start_date: string | null
    rental_end_date: string | null
    notes: string | null
  }>

  materials: Array<{
    name: string
    type: string | null
    quantity_estimated: number | null
    unit: string | null
    notes: string | null
  }>

  /** Office-manager-added items that don't come from the job record. */
  extra_items: Array<{
    label: string
    detail: string | null
  }>
}

export interface ManifestVehicle {
  id: string
  manifest_id: string
  vehicle_type: string | null
  make_model: string | null
  plate: string | null
  driver_profile_id: string | null
  driver_name: string | null
  is_rental: boolean
  rental_vendor: string | null
  rental_rate_daily: number | null
  rental_start_date: string | null
  rental_end_date: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export type ManifestStatus = 'draft' | 'issued'

export interface Manifest {
  id: string
  organization_id: string
  job_id: string
  manifest_number: string
  status: ManifestStatus
  snapshot: ManifestSnapshot
  notes: string | null
  issued_at: string | null
  issued_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ManifestWithVehicles extends Manifest {
  vehicles: ManifestVehicle[]
}
