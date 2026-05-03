/**
 * Work order snapshot schema.
 * Versioned via the `version` field so future shape changes don't break
 * records written with an older layout. Consumers should check `version`
 * before reading fields that may not have existed yet.
 */
export interface WorkOrderSnapshot {
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
    // Used to surface the survey's photos and videos on the work order so
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

export interface WorkOrderVehicle {
  id: string
  work_order_id: string
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

export type WorkOrderStatus = 'draft' | 'issued' | 'revised' | 'completed' | 'archived'

export interface WorkOrder {
  id: string
  organization_id: string
  job_id: string
  work_order_number: string
  status: WorkOrderStatus
  snapshot: WorkOrderSnapshot
  notes: string | null
  issued_at: string | null
  issued_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkOrderWithVehicles extends WorkOrder {
  vehicles: WorkOrderVehicle[]
}

// Documents attached to a work order. Distinct from job_documents (which
// outlive any single dispatch and hold the regulatory artifacts) — these
// are the day-of references the crew actually needs in their hands.
export type WorkOrderDocumentCategory =
  | 'sds'
  | 'manual'
  | 'access'
  | 'pre_work'
  | 'signed_acknowledgment'
  | 'other'

export interface WorkOrderDocument {
  id: string
  organization_id: string
  work_order_id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  category: WorkOrderDocumentCategory
  notes: string | null
  uploaded_by: string | null
  uploaded_at: string
  updated_at: string
}

export interface WorkOrderDocumentInsert {
  organization_id: string
  work_order_id: string
  file_name: string
  storage_path: string
  mime_type?: string | null
  size_bytes?: number | null
  category?: WorkOrderDocumentCategory
  notes?: string | null
  uploaded_by?: string | null
}

export interface WorkOrderDocumentUpdate {
  file_name?: string
  category?: WorkOrderDocumentCategory
  notes?: string | null
}
