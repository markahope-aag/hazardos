import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  FollowUp,
  FollowUpEntityType,
  FollowUpWithAssignee,
  NextPendingFollowUp,
} from '@/types/follow-ups'
import type {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  FollowUpListQuery,
} from '@/lib/validations/follow-ups'

const SELECT_COLUMNS =
  'id, organization_id, entity_type, entity_id, due_date, note, assigned_to, completed_at, completed_by, created_by, created_at, updated_at'

const SELECT_WITH_ASSIGNEE = `
  ${SELECT_COLUMNS},
  assignee:profiles!assigned_to(id, first_name, last_name, email)
`

function normalizeAssignee(row: Record<string, unknown>): FollowUpWithAssignee {
  const assignee = row.assignee
  if (Array.isArray(assignee)) {
    row.assignee = assignee[0] ?? null
  }
  return row as unknown as FollowUpWithAssignee
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

    const { data, error, count } = await query
    if (error) throwDbError(error, 'fetch follow-ups')

    const follow_ups = (data || []).map(row =>
      normalizeAssignee({ ...(row as Record<string, unknown>) })
    )
    return { follow_ups, total: count || 0 }
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
    return normalizeAssignee({ ...(data as Record<string, unknown>) })
  }

  static async create(input: CreateFollowUpInput): Promise<FollowUp> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    // Fetch existing to drive activity logging on transitions.
    const existing = await this.get(id)
    if (!existing) throw new SecureError('NOT_FOUND', 'Follow-up not found')

    const patch: Record<string, unknown> = {}
    if (updates.due_date !== undefined) patch.due_date = updates.due_date
    if (updates.note !== undefined) patch.note = updates.note
    if (updates.assigned_to !== undefined) patch.assigned_to = updates.assigned_to

    if (updates.completed === true && !existing.completed_at) {
      patch.completed_at = new Date().toISOString()
      patch.completed_by = user.id
    } else if (updates.completed === false && existing.completed_at) {
      patch.completed_at = null
      patch.completed_by = null
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
