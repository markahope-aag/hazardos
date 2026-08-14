export type FollowUpEntityType =
  | 'estimate'
  | 'job'
  | 'opportunity'
  | 'customer'
  | 'contact'
  | 'site_survey'
  | 'invoice'
  | 'proposal'

/**
 * What the engine does with a step. The tenant's own wording lives on
 * `activity_types.name`; this is the fixed set the code branches on.
 */
export type ActivityKind = 'call' | 'email' | 'text' | 'todo'

/** Where the row came from. Machine-created work is not editable the same way. */
export type FollowUpSource = 'manual' | 'process' | 'import'

export interface ActivityType {
  id: string
  name: string
  kind: ActivityKind
  is_active: boolean
  is_system: boolean
  sort_order: number
}

export interface ActivityOutcome {
  id: string
  name: string
  /** Completing with this outcome stops the chain instead of advancing it. */
  halts_chain: boolean
  is_active: boolean
  is_system: boolean
  sort_order: number
}

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
  kind: ActivityKind
  activity_type_id: string | null
  outcome_id: string | null
  /** Minutes before `due_date` to remind. Null means no reminder. */
  reminder_minutes: number | null
  source: FollowUpSource
  /** Identifier in the system this was imported from, if any. */
  external_ref: string | null
  /**
   * Set when queued work was overtaken by events and will never happen, for
   * example a nurture step on a lead who has since bought. Distinct from
   * completed: nobody did this, and the reason says why nobody will.
   */
  canceled_at: string | null
  canceled_by: string | null
  cancel_reason: string | null
}

export interface FollowUpWithAssignee extends FollowUp {
  assignee?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  activity_type?: Pick<ActivityType, 'id' | 'name' | 'kind'> | null
  outcome?: Pick<ActivityOutcome, 'id' | 'name' | 'halts_chain'> | null
}

/**
 * What a work item is attached to, resolved for display.
 *
 * A queue that only shows "customer" and a UUID is unusable. The row itself
 * holds `entity_type` and `entity_id`, so the label and link are looked up
 * per type and attached on the way out.
 */
export interface FollowUpEntityRef {
  label: string
  href: string
}

export interface FollowUpQueueItem extends FollowUpWithAssignee {
  entity: FollowUpEntityRef | null
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
