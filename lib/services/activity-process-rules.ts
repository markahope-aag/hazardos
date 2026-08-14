/**
 * Deciding which chains fire when something happens.
 *
 * Pure matching logic, no database access, so the semantics can be tested
 * exhaustively. The rule that matters and is easy to get wrong: a NULL
 * qualifier on a rule means "any", so an absent condition widens a rule rather
 * than narrowing it. Getting that backwards means either nothing ever fires or
 * everything does.
 *
 * See docs/marketsharp-hazardos-diff.md item P1-2.
 */

export type ProcessEventType =
  | 'activity_completed'
  | 'opportunity_stage_changed'
  | 'job_status_changed'
  | 'lab_result_received'
  | 'message_failed'

export type ContactSegment = 'residential' | 'commercial'

/** What happened. Only the fields relevant to `type` are expected to be set. */
export interface ProcessEvent {
  type: ProcessEventType
  activityTypeId?: string | null
  outcomeId?: string | null
  pipelineStageId?: string | null
  jobStatus?: string | null
  labResult?: 'positive' | 'negative' | null
  messageChannel?: 'email' | 'sms' | null
  /** The segment of the contact this event concerns, if known. */
  contactType?: ContactSegment | null
}

/** The subset of a rule row the matcher needs. */
export interface ProcessRule {
  id: string
  event_type: string
  activity_type_id: string | null
  outcome_id: string | null
  pipeline_stage_id: string | null
  job_status: string | null
  lab_result: string | null
  message_channel: string | null
  contact_type: string | null
  process_id: string
  is_active: boolean
  sort_order: number
}

/**
 * A rule qualifier matches when it is null (meaning "any") or equal to the
 * event's value.
 *
 * A rule that names a qualifier the event does not carry does NOT match. That
 * is deliberate: a rule saying "outcome must be Not Interested" should not fire
 * on an event with no outcome at all, which would be the effect of treating a
 * missing event value as a wildcard too.
 */
function qualifierMatches(ruleValue: string | null, eventValue: string | null | undefined): boolean {
  if (ruleValue === null) return true
  return eventValue != null && eventValue === ruleValue
}

export function ruleMatches(rule: ProcessRule, event: ProcessEvent): boolean {
  if (!rule.is_active) return false
  if (rule.event_type !== event.type) return false

  return (
    qualifierMatches(rule.activity_type_id, event.activityTypeId) &&
    qualifierMatches(rule.outcome_id, event.outcomeId) &&
    qualifierMatches(rule.pipeline_stage_id, event.pipelineStageId) &&
    qualifierMatches(rule.job_status, event.jobStatus) &&
    qualifierMatches(rule.lab_result, event.labResult) &&
    qualifierMatches(rule.message_channel, event.messageChannel) &&
    qualifierMatches(rule.contact_type, event.contactType)
  )
}

/**
 * Every process that should fire for this event, in rule order, with each
 * process appearing at most once.
 *
 * All matching rules fire, not just the most specific one. AHS rely on this:
 * they have a catch-all "Email Failure on any reference fires Bad email bounce"
 * sitting alongside specific rules, and both are meant to apply.
 *
 * The deduplication is what stops two rules pointing at the same chain from
 * creating the work twice. Two such rules are legitimate (a residential rule
 * and a commercial rule can share a chain), so this is a real case rather than
 * a guard against misconfiguration.
 */
export function selectProcessesToRun(rules: ProcessRule[], event: ProcessEvent): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rule of [...rules].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))) {
    if (!ruleMatches(rule, event)) continue
    if (seen.has(rule.process_id)) continue
    seen.add(rule.process_id)
    result.push(rule.process_id)
  }

  return result
}
