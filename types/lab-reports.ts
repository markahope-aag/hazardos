// Lab Reports types

export type LabReportStatus = 'ordered' | 'received' | 'cancelled'

export type LabSampleType =
  | 'asbestos_bulk'
  | 'asbestos_air'
  | 'lead_paint'
  | 'lead_dust'
  | 'lead_water'
  | 'lead_soil'
  | 'mold_air'
  | 'mold_surface'
  | 'silica'
  | 'other'

export interface Lab {
  id: string
  organization_id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LabReport {
  id: string
  organization_id: string
  report_number: string

  ordered_date: string
  lab_id: string | null
  sample_type: LabSampleType
  sample_description: string | null

  site_address: string | null
  site_city: string | null
  site_state: string | null
  site_zip: string | null

  estimate_id: string | null
  work_order_id: string | null
  invoice_id: string | null
  customer_id: string | null

  status: LabReportStatus
  received_date: string | null

  file_name: string | null
  storage_path: string | null
  mime_type: string | null
  size_bytes: number | null

  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LabReportWithRelations extends LabReport {
  lab: Pick<Lab, 'id' | 'name'> | null
  estimate: { id: string; estimate_number: string; project_name: string | null } | null
  work_order: { id: string; work_order_number: string } | null
  invoice: { id: string; invoice_number: string } | null
  customer: {
    id: string
    name: string
    company_name: string | null
  } | null
}

export const LAB_SAMPLE_TYPE_LABELS: Record<LabSampleType, string> = {
  asbestos_bulk: 'Asbestos — Bulk',
  asbestos_air: 'Asbestos — Air',
  lead_paint: 'Lead — Paint',
  lead_dust: 'Lead — Dust',
  lead_water: 'Lead — Water',
  lead_soil: 'Lead — Soil',
  mold_air: 'Mold — Air',
  mold_surface: 'Mold — Surface',
  silica: 'Silica',
  other: 'Other',
}

export const LAB_REPORT_STATUS_CONFIG: Record<
  LabReportStatus,
  { label: string; color: string; bgColor: string }
> = {
  ordered: { label: 'Ordered', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  received: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}
