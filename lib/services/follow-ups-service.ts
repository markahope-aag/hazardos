import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  FollowUp,
  FollowUpEntityRef,
  FollowUpEntityType,
  FollowUpQueueItem,
  FollowUpWithAssignee,
  NextPendingFollowUp,
} from '@/types/follow-ups'
import type {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  FollowUpListQuery,
} from '@/lib/validations/follow-ups'

const SELECT_COLUMNS =
  'id, organization_id, entity_type, entity_id, due_date, note, assigned_to, completed_at, completed_by, created_by, created_at, updated_at, kind, activity_type_id, outcome_id, reminder_minutes, source, external_ref'

const SELECT_WITH_ASSIGNEE = `
  ${SELECT_COLUMNS},
  assignee:profiles!assigned_to(id, first_name, last_name, email),
  activity_type:activity_types!activity_type_id(id, name, kind),
  outcome:activity_outcomes!outcome_id(id, name, halts_chain)
`

// PostgREST returns an embedded row as an array when it can't prove the
// relationship is to-one. Flatten them so callers get an object or null.
function normalizeEmbeds(row: Record<string, unknown>): FollowUpWithAssignee {
  for (const key of ['assignee', 'activity_type', 'outcome']) {
    const value = row[key]
    if (Array.isArray(value)) row[key] = value[0] ?? null
  }
  return row as unknown as FollowUpWithAssignee
}

/**
 * Where each entity type's display name and link come from.
 *
 * A work queue spanning eight entity types has to say what each item is
 * about. One query per type present, not one per row.
 */
const ENTITY_SOURCES: Record<
  FollowUpEntityType,
  { table: string; columns: string; href: (id: string) => string; label: (row: Record<string, unknown>) => string }
> = {
  customer: {
    table: 'customers',
    columns: 'id, name, company_name',
    href: (id) => `/crm/contacts/${id}`,
    label: (r) => (r.company_name as string) || (r.name as string) || 'Contact',
  },
  contact: {
    table: 'customers',
    columns: 'id, name, company_name',
    href: (id) => `/crm/contacts/${id}`,
    label: (r) => (r.company_name as string) || (r.name as string) || 'Contact',
  },
  opportunity: {
    table: 'opportunities',
    columns: 'id, name',
    href: (id) => `/crm/opportunities/${id}`,
    label: (r) => (r.name as string) || 'Opportunity',
  },
  job: {
    table: 'jobs',
    columns: 'id, job_number, name',
    href: (id) => `/jobs/${id}`,
    label: (r) => [r.job_number, r.name].filter(Boolean).join(' · ') || 'Job',
  },
  estimate: {
    table: 'estimates',
    columns: 'id, estimate_number',
    href: (id) => `/estimates/${id}`,
    label: (r) => (r.estimate_number as string) || 'Estimate',
  },
  invoice: {
    table: 'invoices',
    columns: 'id, invoice_number',
    href: (id) => `/invoices/${id}`,
    label: (r) => (r.invoice_number as string) || 'Invoice',
  },
  proposal: {
    table: 'proposals',
    columns: 'id, proposal_number',
    href: (id) => `/proposals/${id}`,
    label: (r) => (r.proposal_number as string) || 'Proposal',
  },
  site_survey: {
    table: 'site_surveys',
    columns: 'id, job_name',
    href: (id) => `/site-surveys/${id}`,
    label: (r) => (r.job_name as string) || 'Site survey',
  },
}

export class FollowUpsService {
  /**
   * List follow-ups for the current org.
   * Defaults to pending only, ordered by due_date ascending (oldest-overdue first).
   */
  static async list(filters: FollowUpListQuery = {}): Promise<{
    follow_ups: FollowUpWithAssignee[]
    total: number
  }> {
    const supabase = await createClient()
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0
    const state = filters.state ?? 'pending'

    let query = supabase
      .from('follow_ups')
      .select(SELECT_WITH_ASSIGNEE, { count: 'exact' })
      .order('due_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (state === 'pending') {
      query = query.is('completed_at', null)
    } else if (state === 'completed') {
      query = query.not('completed_at', 'is', null)
    }

    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
    if (filters.entity_id) query = query.eq('entity_id', filters.entity_id)
    if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
    if (filters.kind) query = query.eq('kind', filters.kind)
    if (filters.due_before) query = query.lte('due_date', filters.due_before)
    if (filters.due_after) query = query.gte('due_date', filters.due_after)

    const { data, error, count } = await query
    if (error) throwDbError(error, 'fetch follow-ups')

    const follow_ups = (data || []).map(row =>
      normalizeEmbeds({ ...(row as Record<string, unknown>) })
    )
    return { follow_ups, total: count || 0 }
  }

  /**
   * The cross-entity work queue: one person's dated list, spanning contacts,
   * jobs, surveys and everything else, with each item labeled by what it is
   * attached to.
   *
   * This is the screen the office lives in. The per-entity follow-up panels
   * answer "what is outstanding on this job"; this answers "what am I doing
   * today", which is a different and more frequent question.
   */
  static async queue(filters: FollowUpListQuery = {}): Promise<{
    items: FollowUpQueueItem[]
    total: number
  }> {
    const { follow_ups, total } = await this.list(filters)
    const entities = await this.resolveEntities(follow_ups)
    const items = follow_ups.map(f => ({
      ...f,
      entity: entities.get(`${f.entity_type}:${f.entity_id}`) ?? null,
    }))
    return { items, total }
  }

  /**
   * Batch-resolves display labels for the entities a set of follow-ups points
   * at. One query per distinct entity type present, so a 50-row queue costs at
   * most eight extra round trips rather than fifty.
   *
   * A missing row yields no entry rather than throwing: a follow-up can
   * outlive the thing it was about, and that should degrade to a plain label
   * rather than blanking the whole queue.
   */
  private static async resolveEntities(
    rows: Pick<FollowUp, 'entity_type' | 'entity_id'>[]
  ): Promise<Map<string, FollowUpEntityRef>> {
    const result = new Map<string, FollowUpEntityRef>()
    if (rows.length === 0) return result

    const byType = new Map<FollowUpEntityType, Set<string>>()
    for (const row of rows) {
      if (!byType.has(row.entity_type)) byType.set(row.entity_type, new Set())
      byType.get(row.entity_type)!.add(row.entity_id)
    }

    const supabase = await createClient()
    await Promise.all(
      [...byType.entries()].map(async ([type, ids]) => {
        const source = ENTITY_SOURCES[type]
        if (!source) return
        const { data, error } = await supabase
          .from(source.table)
          .select(source.columns)
          .in('id', [...ids])
        if (error || !data) return
        for (const row of data as unknown as Record<string, unknown>[]) {
          const id = row.id as string
          result.set(`${type}:${id}`, { label: source.label(row), href: source.href(id) })
        }
      })
    )

    return result
  }

  /**
   * Batched lookup for list views. Given a set of entity IDs, returns the
   * next pending follow-up for each (map keyed by entity_id). Used by the
   * estimates / jobs / opportunities list pages to show "next action due"
   * in one extra round-trip per page load.
   */
  static async getNextPendingForEntities(
    entityType: FollowUpEntityType,
    entityIds: string[]
  ): Promise<Map<string, NextPendingFollowUp>> {
    if (entityIds.length === 0) return new Map()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('follow_ups')
      .select('id, entity_id, due_date, note, assigned_to')
      .eq('entity_type', entityType)
      .in('entity_id', entityIds)
      .is('completed_at', null)
      .order('due_date', { ascending: true })

    if (error) throwDbError(error, 'fetch follow-ups for entities')

    const result = new Map<string, NextPendingFollowUp>()
    for (const row of data || []) {
      // Query is ordered due_date ASC, so the first row per entity_id is
      // the earliest-due pending follow-up.
      if (!result.has(row.entity_id)) {
        result.set(row.entity_id, {
          id: row.id,
          due_date: row.due_date,
          note: row.note,
          assigned_to: row.assigned_to,
        })
      }
    }
    return result
  }

  static async get(id: string): Promise<FollowUpWithAssignee | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('follow_ups')
      .select(SELECT_WITH_ASSIGNEE)
      .eq('id', id)
      .maybeSingle()

    if (error) throwDbError(error, 'fetch follow-up')
    if (!data) return null
    return normalizeEmbeds({ ...(data as Record<string, unknown>) })
  }

  static async create(input: CreateFollowUpInput): Promise<FollowUp> {
    const supabase = await createClient()
    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        organization_id: profile.organization_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        due_date: input.due_date,
        note: input.note ?? null,
        assigned_to: input.assigned_to ?? null,
        created_by: user.id,
        kind: input.kind ?? 'todo',
        activity_type_id: input.activity_type_id ?? null,
        reminder_minutes: input.reminder_minutes ?? null,
        // Anything created through this path was typed by a person. Chains and
        // imports write their own rows with the right source.
        source: 'manual',
      })
      .select(SELECT_COLUMNS)
      .single()

    if (error) throwDbError(error, 'create follow-up')

    // Record on the parent entity's activity timeline so it shows up in
    // "last activity" queries and on the entity detail page.
    await Activity.note(
      input.entity_type,
      input.entity_id,
      undefined,
      `Follow-up scheduled for ${new Date(input.due_date).toLocaleDateString()}${
        input.note ? `: ${input.note}` : ''
      }`
    )

    return data as FollowUp
  }

  static async update(id: string, updates: UpdateFollowUpInput): Promise<FollowUp> {
    const supabase = await createClient()
    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    // Fetch existing to drive activity logging on transitions.
    const existing = await this.get(id)
    if (!existing) throw new SecureError('NOT_FOUND', 'Follow-up not found')

    const patch: Record<string, unknown> = {}
    if (updates.due_date !== undefined) patch.due_date = updates.due_date
    if (updates.note !== undefined) patch.note = updates.note
    if (updates.assigned_to !== undefined) patch.assigned_to = updates.assigned_to
    if (updates.kind !== undefined) patch.kind = updates.kind
    if (updates.activity_type_id !== undefined) patch.activity_type_id = updates.activity_type_id
    if (updates.outcome_id !== undefined) patch.outcome_id = updates.outcome_id
    if (updates.reminder_minutes !== undefined) patch.reminder_minutes = updates.reminder_minutes

    if (updates.completed === true && !existing.completed_at) {
      patch.completed_at = new Date().toISOString()
      patch.completed_by = user.id
    } else if (updates.completed === false && existing.completed_at) {
      patch.completed_at = null
      patch.completed_by = null
      // Reopening clears the outcome, unless this same call sets a new one.
      // Leaving a stale "Not interested" on a reopened item would later tell
      // the chain engine to stay halted.
      if (updates.outcome_id === undefined) patch.outcome_id = null
    }

    const { data, error } = await supabase
      .from('follow_ups')
      .update(patch)
      .eq('id', id)
      .select(SELECT_COLUMNS)
      .single()

    if (error) throwDbError(error, 'update follow-up')

    if (updates.completed === true && !existing.completed_at) {
      await Activity.note(
        existing.entity_type,
        existing.entity_id,
        undefined,
        `Follow-up completed${existing.note ? `: ${existing.note}` : ''}`
      )
    }

    return data as FollowUp
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('follow_ups').delete().eq('id', id)
    if (error) throwDbError(error, 'delete follow-up')
  }
}
