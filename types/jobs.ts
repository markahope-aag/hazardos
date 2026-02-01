export type JobStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | 'closed'
  | 'cancelled'

export type CrewRole = 'lead' | 'crew' | 'supervisor' | 'trainee'

export type JobNoteType =
  | 'general'
  | 'issue'
  | 'customer_communication'
  | 'inspection'
  | 'safety'
  | 'photo'

export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected'

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type EquipmentStatus = 'assigned' | 'deployed' | 'returned'

export interface Job {
  id: string
  organization_id: string
  proposal_id: string | null
  estimate_id: string | null
  customer_id: string
  site_survey_id: string | null
  job_number: string
  name: string | null
  status: JobStatus
  hazard_types: string[]
  scheduled_start_date: string
  scheduled_start_time: string | null
  scheduled_end_date: string | null
  scheduled_end_time: string | null
  estimated_duration_hours: number | null
  actual_start_at: string | null
  actual_end_at: string | null
  job_address: string
  job_city: string | null
  job_state: string | null
  job_zip: string | null
  job_latitude: number | null
  job_longitude: number | null
  access_notes: string | null
  gate_code: string | null
  lockbox_code: string | null
  contact_onsite_name: string | null
  contact_onsite_phone: string | null
  contract_amount: number | null
  change_order_amount: number
  final_amount: number | null
  completion_notes: string | null
  completion_photos: CompletionPhoto[]
  customer_signed_off: boolean
  customer_signoff_at: string | null
  customer_signoff_name: string | null
  inspection_required: boolean
  inspection_passed: boolean | null
  inspection_date: string | null
  inspection_notes: string | null
  internal_notes: string | null
  special_instructions: string | null
  created_by: string | null
  created_at: string
  updated_at: string

  // Relations
  customer?: CustomerRelation
  proposal?: ProposalRelation
  estimate?: EstimateRelation
  site_survey?: SiteSurveyRelation
  crew?: JobCrew[]
  equipment?: JobEquipment[]
  materials?: JobMaterial[]
  disposal?: JobDisposal[]
  change_orders?: JobChangeOrder[]
  notes?: JobNote[]
}

export interface CompletionPhoto {
  url: string
  caption?: string
  taken_at?: string
}

export interface CustomerRelation {
  id: string
  company_name: string | null
  name: string
  first_name?: string
  last_name?: string
  email: string | null
  phone: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
}

export interface ProposalRelation {
  id: string
  proposal_number: string
  total: number
}

export interface EstimateRelation {
  id: string
  estimate_number: string
}

export interface SiteSurveyRelation {
  id: string
}

export interface ProfileRelation {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  role?: string
}

export interface JobCrew {
  id: string
  job_id: string
  profile_id: string
  role: CrewRole
  is_lead: boolean
  scheduled_start: string | null
  scheduled_end: string | null
  clock_in_at: string | null
  clock_out_at: string | null
  break_minutes: number
  hours_worked: number | null
  notes: string | null
  created_at: string
  updated_at: string

  // Relation
  profile?: ProfileRelation
}

export interface JobEquipment {
  id: string
  job_id: string
  equipment_name: string
  equipment_type: string | null
  quantity: number
  is_rental: boolean
  rental_rate_daily: number | null
  rental_start_date: string | null
  rental_end_date: string | null
  rental_days: number | null
  rental_total: number | null
  status: EquipmentStatus
  notes: string | null
  created_at: string
}

export interface JobMaterial {
  id: string
  job_id: string
  material_name: string
  material_type: string | null
  quantity_estimated: number | null
  quantity_used: number | null
  unit: string | null
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
  created_at: string
}

export interface JobDisposal {
  id: string
  job_id: string
  hazard_type: string
  disposal_type: string | null
  quantity: number
  unit: string
  manifest_number: string | null
  manifest_date: string | null
  disposal_facility_name: string | null
  disposal_facility_address: string | null
  disposal_cost: number | null
  manifest_document_url: string | null
  created_at: string
}

export interface JobChangeOrder {
  id: string
  job_id: string
  change_order_number: string
  description: string
  reason: string | null
  amount: number
  status: ChangeOrderStatus
  approved_by: string | null
  approved_at: string | null
  customer_approved: boolean
  customer_approved_at: string | null
  created_by: string | null
  created_at: string

  // Relation
  approver?: ProfileRelation
}

export interface JobNoteAttachment {
  url: string
  filename: string
  type: string
}

export interface JobNote {
  id: string
  job_id: string
  note_type: JobNoteType
  content: string
  attachments: JobNoteAttachment[]
  is_internal: boolean
  created_by: string | null
  created_at: string

  // Relation
  author?: ProfileRelation
}

export interface ScheduledReminder {
  id: string
  organization_id: string
  related_type: string
  related_id: string
  reminder_type: string
  recipient_type: string
  recipient_email: string | null
  recipient_phone: string | null
  channel: string
  scheduled_for: string
  status: ReminderStatus
  sent_at: string | null
  error: string | null
  template_slug: string | null
  template_variables: Record<string, unknown>
  created_at: string
}

// Input types
export interface CreateJobInput {
  proposal_id?: string
  customer_id: string
  scheduled_start_date: string
  scheduled_start_time?: string
  scheduled_end_date?: string
  estimated_duration_hours?: number
  job_address: string
  job_city?: string
  job_state?: string
  job_zip?: string
  access_notes?: string
  special_instructions?: string
  hazard_types?: string[]
  name?: string
}

export interface CreateJobFromProposalInput {
  proposal_id: string
  scheduled_start_date: string
  scheduled_start_time?: string
  estimated_duration_hours?: number
}

export interface UpdateJobInput {
  name?: string
  status?: JobStatus
  scheduled_start_date?: string
  scheduled_start_time?: string
  scheduled_end_date?: string
  scheduled_end_time?: string
  estimated_duration_hours?: number
  job_address?: string
  job_city?: string
  job_state?: string
  job_zip?: string
  access_notes?: string
  gate_code?: string
  lockbox_code?: string
  contact_onsite_name?: string
  contact_onsite_phone?: string
  inspection_required?: boolean
  inspection_passed?: boolean
  inspection_date?: string
  inspection_notes?: string
  internal_notes?: string
  special_instructions?: string
  completion_notes?: string
}

export interface AssignCrewInput {
  job_id: string
  profile_id: string
  role?: CrewRole
  is_lead?: boolean
  scheduled_start?: string
  scheduled_end?: string
}

export interface ClockInOutInput {
  job_crew_id: string
  action: 'clock_in' | 'clock_out'
  timestamp?: string
}

export interface AddChangeOrderInput {
  description: string
  reason?: string
  amount: number
}

export interface AddJobNoteInput {
  note_type: JobNoteType
  content: string
  attachments?: JobNoteAttachment[]
  is_internal?: boolean
}

export interface AddJobEquipmentInput {
  equipment_name: string
  equipment_type?: string
  quantity?: number
  is_rental?: boolean
  rental_rate_daily?: number
  rental_start_date?: string
  rental_end_date?: string
  notes?: string
}

export interface AddJobMaterialInput {
  material_name: string
  material_type?: string
  quantity_estimated?: number
  unit?: string
  unit_cost?: number
  notes?: string
}

export interface AddJobDisposalInput {
  hazard_type: string
  disposal_type?: string
  quantity: number
  unit: string
  manifest_number?: string
  manifest_date?: string
  disposal_facility_name?: string
  disposal_facility_address?: string
  disposal_cost?: number
}

// Calendar types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: Job
  color?: string
}

export interface CalendarFilter {
  status?: JobStatus[]
  crew_member_id?: string
  hazard_types?: string[]
  date_range?: {
    start: string
    end: string
  }
}

// Display configuration
export const jobStatusConfig: Record<JobStatus, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  invoiced: { label: 'Invoiced', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  paid: { label: 'Paid', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
}

export const crewRoleConfig: Record<CrewRole, { label: string; color: string; bgColor: string }> = {
  lead: { label: 'Lead', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  crew: { label: 'Crew', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  supervisor: { label: 'Supervisor', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  trainee: { label: 'Trainee', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
}

export const noteTypeConfig: Record<JobNoteType, { label: string; icon: string; color: string; bgColor: string }> = {
  general: { label: 'General', icon: 'MessageSquare', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  issue: { label: 'Issue', icon: 'AlertTriangle', color: 'text-red-700', bgColor: 'bg-red-100' },
  customer_communication: { label: 'Customer Communication', icon: 'Phone', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  inspection: { label: 'Inspection', icon: 'ClipboardCheck', color: 'text-green-700', bgColor: 'bg-green-100' },
  safety: { label: 'Safety', icon: 'Shield', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  photo: { label: 'Photo', icon: 'Camera', color: 'text-purple-700', bgColor: 'bg-purple-100' },
}
