// ============================================================================
// Estimate Types
// ============================================================================

export type EstimateStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'

export type LineItemType =
  | 'labor'
  | 'equipment'
  | 'material'
  | 'disposal'
  | 'travel'
  | 'permit'
  | 'testing'
  | 'other'

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'expired'
  | 'declined'

// ============================================================================
// Database Types
// ============================================================================

export interface Estimate {
  id: string
  organization_id: string
  site_survey_id: string
  customer_id: string | null

  // Identification
  estimate_number: string
  version: number

  // Status
  status: EstimateStatus

  // Pricing
  subtotal: number
  markup_percent: number
  markup_amount: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total: number

  // Project details
  project_name: string | null
  project_description: string | null
  scope_of_work: string | null

  // Timeline
  estimated_duration_days: number | null
  estimated_start_date: string | null
  estimated_end_date: string | null

  // Validity
  valid_until: string | null

  // Approval
  approved_by: string | null
  approved_at: string | null
  approval_notes: string | null

  // Notes
  internal_notes: string | null

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EstimateLineItem {
  id: string
  estimate_id: string

  // Details
  item_type: LineItemType
  category: string | null
  description: string

  // Pricing
  quantity: number
  unit: string
  unit_price: number
  total_price: number

  // Source reference
  source_rate_id: string | null
  source_table: string | null

  // Display
  sort_order: number

  // Flags
  is_optional: boolean
  is_included: boolean

  // Notes
  notes: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface Proposal {
  id: string
  organization_id: string
  estimate_id: string
  customer_id: string | null

  // Identification
  proposal_number: string

  // Status
  status: ProposalStatus

  // Portal access
  access_token: string | null
  access_token_expires_at: string | null

  // Content
  cover_letter: string | null
  terms_and_conditions: string | null
  payment_terms: string | null
  exclusions: string[] | null
  inclusions: string[] | null

  // Tracking
  sent_at: string | null
  sent_to_email: string | null
  viewed_at: string | null
  viewed_count: number

  // Signature
  signed_at: string | null
  signer_name: string | null
  signer_email: string | null
  signer_ip: string | null
  signature_data: string | null

  // Expiration
  valid_until: string | null

  // PDF
  pdf_path: string | null
  pdf_generated_at: string | null

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface EstimateWithRelations extends Estimate {
  site_survey?: {
    id: string
    job_name: string | null
    site_address: string
    site_city: string
    site_state: string
    site_zip: string
    hazard_type: string
    status: string
  } | null
  customer?: {
    id: string
    company_name: string | null
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  } | null
  created_by_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  approved_by_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  line_items?: EstimateLineItem[]
  proposals?: Proposal[]
}

export interface ProposalWithRelations extends Proposal {
  estimate?: EstimateWithRelations | null
  customer?: {
    id: string
    company_name: string | null
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
  } | null
  organization?: {
    id: string
    name: string
    logo_url: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    phone: string | null
    email: string | null
    website: string | null
  } | null
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateEstimateInput {
  site_survey_id: string
  customer_id?: string
  project_name?: string
  project_description?: string
  scope_of_work?: string
  estimated_duration_days?: number
  estimated_start_date?: string
  estimated_end_date?: string
  valid_until?: string
  markup_percent?: number
  discount_percent?: number
  tax_percent?: number
  internal_notes?: string
}

export interface UpdateEstimateInput {
  project_name?: string
  project_description?: string
  scope_of_work?: string
  estimated_duration_days?: number
  estimated_start_date?: string
  estimated_end_date?: string
  valid_until?: string
  markup_percent?: number
  discount_percent?: number
  tax_percent?: number
  internal_notes?: string
  status?: EstimateStatus
}

export interface CreateLineItemInput {
  estimate_id: string
  item_type: LineItemType
  category?: string
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  is_optional?: boolean
  is_included?: boolean
  notes?: string
  sort_order?: number
}

export interface UpdateLineItemInput {
  item_type?: LineItemType
  category?: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  is_optional?: boolean
  is_included?: boolean
  notes?: string
  sort_order?: number
}

export interface CreateProposalInput {
  estimate_id: string
  cover_letter?: string
  terms_and_conditions?: string
  payment_terms?: string
  exclusions?: string[]
  inclusions?: string[]
  valid_until?: string
}

export interface SendProposalInput {
  proposal_id: string
  recipient_email: string
  recipient_name?: string
  custom_message?: string
}

export interface SignProposalInput {
  access_token: string
  signer_name: string
  signer_email: string
  signature_data: string // Base64 encoded signature image
}

// ============================================================================
// Calculator Types
// ============================================================================

export interface CalculatedLineItem {
  item_type: LineItemType
  category: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  source_rate_id?: string
  source_table?: string
  is_optional: boolean
  is_included: boolean
  notes?: string
}

export interface EstimateCalculation {
  line_items: CalculatedLineItem[]
  subtotal: number
  markup_percent: number
  markup_amount: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total: number
}

// ============================================================================
// Status Display Helpers
// ============================================================================

export const ESTIMATE_STATUS_CONFIG: Record<EstimateStatus, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Estimate is being prepared',
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Awaiting internal approval',
  },
  approved: {
    label: 'Approved',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Approved and ready to send',
  },
  sent: {
    label: 'Sent',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Sent to customer',
  },
  accepted: {
    label: 'Accepted',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Customer accepted estimate',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Customer rejected estimate',
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    description: 'Estimate has expired',
  },
  converted: {
    label: 'Converted',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Converted to job',
  },
}

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, {
  label: string
  color: string
  bgColor: string
  description: string
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Proposal is being prepared',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Sent to customer',
  },
  viewed: {
    label: 'Viewed',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Customer has viewed proposal',
  },
  signed: {
    label: 'Signed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Customer has signed proposal',
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    description: 'Proposal has expired',
  },
  declined: {
    label: 'Declined',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Customer declined proposal',
  },
}

export const LINE_ITEM_TYPE_CONFIG: Record<LineItemType, {
  label: string
  icon: string
}> = {
  labor: { label: 'Labor', icon: 'Users' },
  equipment: { label: 'Equipment', icon: 'Wrench' },
  material: { label: 'Materials', icon: 'Package' },
  disposal: { label: 'Disposal', icon: 'Trash2' },
  travel: { label: 'Travel', icon: 'Car' },
  permit: { label: 'Permits', icon: 'FileCheck' },
  testing: { label: 'Testing', icon: 'FlaskConical' },
  other: { label: 'Other', icon: 'MoreHorizontal' },
}
