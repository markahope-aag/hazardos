export type FollowUpEntityType =
  | 'estimate'
  | 'job'
  | 'opportunity'
  | 'customer'
  | 'contact'
  | 'site_survey'
  | 'invoice'
  | 'proposal'

export interface FollowUp {
  id: string
  organization_id: string
  entity_type: FollowUpEntityType
  entity_id: string
  due_date: string
  note: string | null
  assigned_to: string | null
  completed_at: string | null
  completed_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FollowUpWithAssignee extends FollowUp {
  assignee?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
}

/**
 * Subset fit for a list view: the next pending follow-up for an entity.
 * Used by estimate/job/opportunity lists to show "next action due".
 */
export interface NextPendingFollowUp {
  id: string
  due_date: string
  note: string | null
  assigned_to: string | null
}
