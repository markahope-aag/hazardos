export type StageType = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type OpportunityOutcome = 'won' | 'lost' | 'abandoned'
export type CommissionType = 'percentage' | 'flat' | 'tiered'
export type CommissionAppliesTo = 'won' | 'invoiced' | 'paid'
export type CommissionStatus = 'pending' | 'approved' | 'paid'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ApprovalEntityType = 'estimate' | 'discount' | 'proposal' | 'change_order' | 'expense'

// Pipeline stages
export interface PipelineStage {
  id: string
  organization_id: string
  name: string
  color: string
  stage_type: StageType
  probability: number
  sort_order: number
  is_active: boolean
  created_at: string
}

// Opportunities
export interface Opportunity {
  id: string
  organization_id: string
  customer_id: string
  name: string
  description: string | null
  stage_id: string
  estimated_value: number | null
  weighted_value: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  owner_id: string | null
  estimate_id: string | null
  proposal_id: string | null
  job_id: string | null
  outcome: OpportunityOutcome | null
  loss_reason: string | null
  loss_notes: string | null
  competitor: string | null
  created_at: string
  updated_at: string
  // Joined
  stage?: PipelineStage
  customer?: {
    id: string
    company_name: string | null
    first_name: string
    last_name: string
  }
  owner?: {
    id: string
    full_name: string
  }
}

export interface OpportunityHistory {
  id: string
  opportunity_id: string
  from_stage_id: string | null
  to_stage_id: string
  changed_by: string
  notes: string | null
  created_at: string
  // Joined
  from_stage?: PipelineStage
  to_stage?: PipelineStage
  changed_by_user?: {
    full_name: string
  }
}

// Commissions
export interface CommissionTier {
  min: number
  max: number | null
  rate: number
}

export interface CommissionPlan {
  id: string
  organization_id: string
  name: string
  commission_type: CommissionType
  base_rate: number | null
  tiers: CommissionTier[] | null
  applies_to: CommissionAppliesTo
  is_active: boolean
  created_at: string
}

export interface CommissionEarning {
  id: string
  organization_id: string
  user_id: string
  plan_id: string
  opportunity_id: string | null
  job_id: string | null
  invoice_id: string | null
  base_amount: number
  commission_rate: number
  commission_amount: number
  status: CommissionStatus
  approved_by: string | null
  approved_at: string | null
  paid_at: string | null
  earning_date: string
  pay_period: string | null
  created_at: string
  // Joined
  user?: {
    id: string
    full_name: string
  }
  plan?: CommissionPlan
}

// Approvals
export interface ApprovalThreshold {
  id: string
  organization_id: string
  entity_type: ApprovalEntityType
  threshold_amount: number
  approval_level: number
  approver_role: string | null
  is_active: boolean
  created_at: string
}

export interface ApprovalRequest {
  id: string
  organization_id: string
  entity_type: ApprovalEntityType
  entity_id: string
  amount: number | null
  requested_by: string
  requested_at: string
  level1_status: ApprovalStatus
  level1_approver: string | null
  level1_at: string | null
  level1_notes: string | null
  requires_level2: boolean
  level2_status: ApprovalStatus | null
  level2_approver: string | null
  level2_at: string | null
  level2_notes: string | null
  final_status: ApprovalStatus
  created_at: string
  // Joined
  requester?: {
    full_name: string
  }
  level1_approver_user?: {
    full_name: string
  }
  level2_approver_user?: {
    full_name: string
  }
}

// Input types
export interface CreateOpportunityInput {
  customer_id: string
  name: string
  description?: string
  stage_id: string
  estimated_value?: number
  expected_close_date?: string
  owner_id?: string
}

export interface UpdateOpportunityInput {
  name?: string
  description?: string
  stage_id?: string
  estimated_value?: number
  expected_close_date?: string
  owner_id?: string
  loss_reason?: string
  loss_notes?: string
  competitor?: string
}

export interface MoveOpportunityInput {
  stage_id: string
  notes?: string
}

export interface CreateCommissionPlanInput {
  name: string
  commission_type: CommissionType
  base_rate?: number
  tiers?: CommissionTier[]
  applies_to?: CommissionAppliesTo
}

export interface ApproveCommissionInput {
  approved: boolean
  notes?: string
}

export interface ApprovalDecisionInput {
  approved: boolean
  notes?: string
}

// Pipeline metrics
export interface PipelineMetrics {
  total_value: number
  weighted_value: number
  count: number
  by_stage: {
    stage_id: string
    stage_name: string
    count: number
    value: number
  }[]
}

// Commission summary
export interface CommissionSummary {
  total_pending: number
  total_approved: number
  total_paid: number
  this_month: number
  this_quarter: number
}

// Stage configuration with colors
export const stageTypeConfig: Record<StageType, { color: string; icon: string }> = {
  lead: { color: '#94a3b8', icon: 'UserPlus' },
  qualified: { color: '#3b82f6', icon: 'CheckCircle' },
  proposal: { color: '#8b5cf6', icon: 'FileText' },
  negotiation: { color: '#f59e0b', icon: 'MessageSquare' },
  won: { color: '#22c55e', icon: 'Trophy' },
  lost: { color: '#ef4444', icon: 'XCircle' },
}

// Loss reasons
export const lossReasons = [
  'Price too high',
  'Went with competitor',
  'Budget constraints',
  'Project canceled',
  'Timing not right',
  'No response',
  'Scope mismatch',
  'Other',
] as const

export type LossReason = typeof lossReasons[number]
