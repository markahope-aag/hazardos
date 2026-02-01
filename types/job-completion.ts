import { ProfileRelation } from './jobs'

// Status types
export type TimeEntryWorkType = 'regular' | 'overtime' | 'travel' | 'setup' | 'cleanup' | 'supervision'
export type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'documentation'
export type ChecklistCategory = 'safety' | 'quality' | 'cleanup' | 'documentation' | 'custom'
export type CompletionStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

// ============================================
// Time Entries
// ============================================
export interface JobTimeEntry {
  id: string
  job_id: string
  profile_id: string | null
  work_date: string
  hours: number
  work_type: TimeEntryWorkType
  hourly_rate: number | null
  billable: boolean
  description: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string

  // Relations
  profile?: ProfileRelation
  creator?: ProfileRelation
}

export interface CreateTimeEntryInput {
  job_id: string
  profile_id?: string
  work_date: string
  hours: number
  work_type?: TimeEntryWorkType
  hourly_rate?: number
  billable?: boolean
  description?: string
  notes?: string
}

export interface UpdateTimeEntryInput {
  work_date?: string
  hours?: number
  work_type?: TimeEntryWorkType
  hourly_rate?: number
  billable?: boolean
  description?: string
  notes?: string
}

// ============================================
// Material Usage
// ============================================
export interface JobMaterialUsage {
  id: string
  job_id: string
  job_material_id: string | null
  material_name: string
  material_type: string | null
  quantity_estimated: number | null
  quantity_used: number
  unit: string | null
  unit_cost: number | null
  total_cost: number | null
  variance_quantity: number | null
  variance_percent: number | null
  notes: string | null
  created_by: string | null
  created_at: string

  // Relations
  creator?: ProfileRelation
}

export interface CreateMaterialUsageInput {
  job_id: string
  job_material_id?: string
  material_name: string
  material_type?: string
  quantity_estimated?: number
  quantity_used: number
  unit?: string
  unit_cost?: number
  notes?: string
}

export interface UpdateMaterialUsageInput {
  material_name?: string
  material_type?: string
  quantity_estimated?: number
  quantity_used?: number
  unit?: string
  unit_cost?: number
  notes?: string
}

// ============================================
// Completion Photos
// ============================================
export interface JobCompletionPhoto {
  id: string
  job_id: string
  photo_url: string
  thumbnail_url: string | null
  storage_path: string
  photo_type: PhotoType
  caption: string | null
  taken_at: string | null
  location_lat: number | null
  location_lng: number | null
  camera_make: string | null
  camera_model: string | null
  image_width: number | null
  image_height: number | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string

  // Relations
  uploader?: ProfileRelation
}

export interface CreateCompletionPhotoInput {
  job_id: string
  photo_url: string
  thumbnail_url?: string
  storage_path: string
  photo_type?: PhotoType
  caption?: string
  taken_at?: string
  location_lat?: number
  location_lng?: number
  camera_make?: string
  camera_model?: string
  image_width?: number
  image_height?: number
  file_name?: string
  file_size?: number
  mime_type?: string
}

export interface UpdateCompletionPhotoInput {
  photo_type?: PhotoType
  caption?: string
}

// ============================================
// Completion Checklists
// ============================================
export interface JobCompletionChecklist {
  id: string
  job_id: string
  category: ChecklistCategory
  item_name: string
  item_description: string | null
  sort_order: number
  is_required: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  completion_notes: string | null
  evidence_photo_ids: string[]
  created_at: string
  updated_at: string

  // Relations
  completer?: ProfileRelation
}

export interface CreateChecklistItemInput {
  job_id: string
  category: ChecklistCategory
  item_name: string
  item_description?: string
  sort_order?: number
  is_required?: boolean
}

export interface UpdateChecklistItemInput {
  is_completed?: boolean
  completion_notes?: string
  evidence_photo_ids?: string[]
}

// ============================================
// Job Completions
// ============================================
export interface JobCompletion {
  id: string
  job_id: string
  status: CompletionStatus
  estimated_hours: number | null
  estimated_material_cost: number | null
  estimated_total: number | null
  actual_hours: number | null
  actual_material_cost: number | null
  actual_labor_cost: number | null
  actual_total: number | null
  hours_variance: number | null
  hours_variance_percent: number | null
  cost_variance: number | null
  cost_variance_percent: number | null
  field_notes: string | null
  issues_encountered: string | null
  recommendations: string | null
  submitted_at: string | null
  submitted_by: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  rejection_reason: string | null
  customer_signed: boolean
  customer_signed_at: string | null
  customer_signature_name: string | null
  customer_signature_data: string | null
  created_at: string
  updated_at: string

  // Relations
  submitter?: ProfileRelation
  reviewer?: ProfileRelation
}

export interface CreateCompletionInput {
  job_id: string
  estimated_hours?: number
  estimated_material_cost?: number
  estimated_total?: number
  field_notes?: string
  issues_encountered?: string
  recommendations?: string
}

export interface UpdateCompletionInput {
  field_notes?: string
  issues_encountered?: string
  recommendations?: string
  customer_signed?: boolean
  customer_signature_name?: string
  customer_signature_data?: string
}

export interface SubmitCompletionInput {
  field_notes?: string
  issues_encountered?: string
  recommendations?: string
}

export interface ApproveCompletionInput {
  review_notes?: string
}

export interface RejectCompletionInput {
  rejection_reason: string
  review_notes?: string
}

// ============================================
// Variance Analysis
// ============================================
export interface VarianceAnalysis {
  job_id: string
  job_number: string
  job_name: string | null
  customer_name: string
  completion_date: string | null

  // Hours
  estimated_hours: number | null
  actual_hours: number | null
  hours_variance: number | null
  hours_variance_percent: number | null

  // Costs
  estimated_cost: number | null
  actual_cost: number | null
  cost_variance: number | null
  cost_variance_percent: number | null

  // Materials breakdown
  materials_summary: {
    material_name: string
    estimated_qty: number | null
    actual_qty: number
    variance_qty: number | null
    variance_percent: number | null
    unit: string | null
  }[]
}

export interface VarianceFilters {
  start_date?: string
  end_date?: string
  customer_id?: string
  hazard_types?: string[]
  variance_threshold?: number
}

export interface VarianceSummary {
  total_jobs: number
  over_budget_count: number
  under_budget_count: number
  on_target_count: number
  avg_hours_variance: number
  avg_cost_variance: number
  total_hours_variance: number
  total_cost_variance: number
}

// ============================================
// UI Configuration
// ============================================
export const workTypeConfig: Record<TimeEntryWorkType, { label: string; color: string; bgColor: string }> = {
  regular: { label: 'Regular', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  overtime: { label: 'Overtime', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  travel: { label: 'Travel', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  setup: { label: 'Setup', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  cleanup: { label: 'Cleanup', color: 'text-green-700', bgColor: 'bg-green-100' },
  supervision: { label: 'Supervision', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
}

export const photoTypeConfig: Record<PhotoType, { label: string; color: string; bgColor: string }> = {
  before: { label: 'Before', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  during: { label: 'During', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  after: { label: 'After', color: 'text-green-700', bgColor: 'bg-green-100' },
  issue: { label: 'Issue', color: 'text-red-700', bgColor: 'bg-red-100' },
  documentation: { label: 'Documentation', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

export const checklistCategoryConfig: Record<ChecklistCategory, { label: string; color: string; bgColor: string; icon: string }> = {
  safety: { label: 'Safety', color: 'text-red-700', bgColor: 'bg-red-100', icon: 'Shield' },
  quality: { label: 'Quality', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: 'CheckCircle' },
  cleanup: { label: 'Cleanup', color: 'text-green-700', bgColor: 'bg-green-100', icon: 'Trash2' },
  documentation: { label: 'Documentation', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: 'FileText' },
  custom: { label: 'Custom', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: 'List' },
}

export const completionStatusConfig: Record<CompletionStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  submitted: { label: 'Submitted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
}

// ============================================
// Grouped Checklist Type
// ============================================
export type GroupedChecklists = Record<ChecklistCategory, JobCompletionChecklist[]>
