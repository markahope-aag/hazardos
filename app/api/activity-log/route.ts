import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApiHandler } from '@/lib/utils/api-handler'

const querySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

/**
 * GET /api/activity-log
 *
 * Returns a single unified feed merged from three sources:
 *   - activity_log  (record-level edits, creates, status changes)
 *   - sms_messages  (outbound + inbound SMS)
 *   - email_sends   (transactional + ad-hoc email)
 *
 * The merge happens server-side so the client sees a simple
 * `activity` array sorted by timestamp DESC. Each entry carries a
 * `source` / `kind` pair the renderer uses to pick icon, tint, and
 * body format.
 *
 * RLS keeps all three queries org-scoped automatically.
 */

interface FeedEntry {
  id: string
  source: 'activity' | 'sms' | 'email'
  kind: string
  at: string
  actor: string | null
  entity_type: string | null
  entity_id: string | null
  entity_name: string | null
  title: string
  subtitle: string | null
  body: string | null
  meta: Record<string, unknown> | null
}

type EntityPair = [type: string, id: string]

async function fetchActivityLogRows(
  supabase: SupabaseClient,
  pairs: EntityPair[],
  limit: number,
): Promise<FeedEntry[]> {
  if (pairs.length === 0) return []
  const entityTypes = Array.from(new Set(pairs.map(([t]) => t)))
  const entityIds = pairs.map(([, id]) => id)

  const { data } = await supabase
    .from('activity_log')
    .select(
      'id, user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, description, created_at',
    )
    .in('entity_type', entityTypes)
    .in('entity_id', entityIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map((row): FeedEntry => ({
    id: `activity:${row.id}`,
    source: 'activity',
    kind: row.action,
    at: row.created_at,
    actor: row.user_name,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_name: row.entity_name,
    title: row.description || humanAction(row.action),
    subtitle: null,
    body: null,
    meta: {
      old_values: row.old_values,
      new_values: row.new_values,
    },
  }))
}

async function fetchSmsRows(
  supabase: SupabaseClient,
  customerIds: string[],
  entityPairs: EntityPair[],
  limit: number,
): Promise<FeedEntry[]> {
  // SMS join path differs from activity_log: the direct link is
  // sms_messages.customer_id (always populated when we have one),
  // with an optional related_entity link for when the SMS was
  // triggered by a job/estimate. We OR both to cover both shapes.
  const haveCustomers = customerIds.length > 0
  const haveEntities = entityPairs.length > 0
  if (!haveCustomers && !haveEntities) return []

  let query = supabase
    .from('sms_messages')
    .select(
      'id, customer_id, direction, body, to_phone, from_phone, status, queued_at, sent_at, delivered_at, received_at, message_type, related_entity_type, related_entity_id',
    )
    .order('queued_at', { ascending: false })
    .limit(limit)

  // Build the OR clause. PostgREST syntax: col.eq.X or nested and(...)
  const orClauses: string[] = []
  if (haveCustomers) orClauses.push(`customer_id.in.(${customerIds.join(',')})`)
  for (const [type, id] of entityPairs) {
    // Don't double-count the customer pair — customer_id match already covers it
    if (type === 'customer') continue
    orClauses.push(`and(related_entity_type.eq.${type},related_entity_id.eq.${id})`)
  }
  if (orClauses.length === 0) return []
  query = query.or(orClauses.join(','))

  const { data } = await query
  return (data || []).map((row): FeedEntry => {
    const outbound = row.direction === 'outbound'
    const when =
      (outbound ? row.sent_at || row.queued_at : row.received_at || row.queued_at) ||
      row.queued_at
    const preview = typeof row.body === 'string' ? row.body : ''
    const truncated = preview.length > 180 ? preview.slice(0, 177) + '…' : preview
    return {
      id: `sms:${row.id}`,
      source: 'sms',
      kind: outbound ? 'sms_outbound' : 'sms_inbound',
      at: when,
      actor: outbound ? null : null, // filled in below if we had a phone→person map
      entity_type: row.related_entity_type || 'customer',
      entity_id: row.related_entity_id || row.customer_id,
      entity_name: null,
      title: outbound
        ? `Text sent to ${row.to_phone}`
        : `Text received from ${row.from_phone}`,
      subtitle: null,
      body: truncated,
      meta: {
        status: row.status,
        direction: row.direction,
        message_type: row.message_type,
      },
    }
  })
}

async function fetchEmailRows(
  supabase: SupabaseClient,
  customerIds: string[],
  entityPairs: EntityPair[],
  limit: number,
): Promise<FeedEntry[]> {
  // email_sends is keyed only via related_entity_type/id — there's no
  // direct customer_id column. For a contact, we look up rows where
  // related_entity_type='customer' AND related_entity_id=customerId.
  const customerPairs: EntityPair[] = customerIds.map((id) => ['customer', id])
  const allPairs = [...customerPairs, ...entityPairs]
  if (allPairs.length === 0) return []

  const orClauses = allPairs.map(
    ([t, id]) => `and(related_entity_type.eq.${t},related_entity_id.eq.${id})`,
  )

  const { data } = await supabase
    .from('email_sends')
    .select(
      'id, to_email, from_email, subject, status, sent_at, delivered_at, bounced_at, open_count, related_entity_type, related_entity_id, created_at, tags',
    )
    .or(orClauses.join(','))
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map((row): FeedEntry => {
    const when = row.sent_at || row.created_at
    return {
      id: `email:${row.id}`,
      source: 'email',
      kind: 'email_sent',
      at: when,
      actor: null,
      entity_type: row.related_entity_type,
      entity_id: row.related_entity_id,
      entity_name: null,
      title: `Email: ${row.subject}`,
      subtitle: `To ${row.to_email}`,
      body: null,
      meta: {
        status: row.status,
        from_email: row.from_email,
        delivered_at: row.delivered_at,
        bounced_at: row.bounced_at,
        open_count: row.open_count,
        tags: row.tags,
      },
    }
  })
}

async function collectCustomerScope(
  supabase: SupabaseClient,
  customerId: string,
): Promise<{ pairs: EntityPair[]; customerIds: string[] }> {
  const pairs: EntityPair[] = [['customer', customerId]]
  const [surveys, estimates, proposals, opps, jobs] = await Promise.all([
    supabase.from('site_surveys').select('id').eq('customer_id', customerId),
    supabase.from('estimates').select('id').eq('customer_id', customerId),
    supabase.from('proposals').select('id').eq('customer_id', customerId),
    supabase.from('opportunities').select('id').eq('customer_id', customerId),
    supabase.from('jobs').select('id').eq('customer_id', customerId),
  ])
  for (const row of surveys.data || []) pairs.push(['site_survey', row.id])
  for (const row of estimates.data || []) pairs.push(['estimate', row.id])
  for (const row of proposals.data || []) pairs.push(['proposal', row.id])
  for (const row of opps.data || []) pairs.push(['opportunity', row.id])
  for (const row of jobs.data || []) pairs.push(['job', row.id])
  return { pairs, customerIds: [customerId] }
}

async function collectCompanyScope(
  supabase: SupabaseClient,
  companyId: string,
): Promise<{ pairs: EntityPair[]; customerIds: string[] }> {
  const pairs: EntityPair[] = [['company', companyId]]
  const [contacts, opps, jobs] = await Promise.all([
    supabase.from('customers').select('id').eq('company_id', companyId),
    supabase.from('opportunities').select('id').eq('company_id', companyId),
    supabase.from('jobs').select('id').eq('company_id', companyId),
  ])
  const customerIds = (contacts.data || []).map((r) => r.id as string)
  for (const id of customerIds) pairs.push(['customer', id])
  for (const row of opps.data || []) pairs.push(['opportunity', row.id])
  for (const row of jobs.data || []) pairs.push(['job', row.id])
  if (customerIds.length > 0) {
    const [surveys, estimates, proposals] = await Promise.all([
      supabase.from('site_surveys').select('id').in('customer_id', customerIds),
      supabase.from('estimates').select('id').in('customer_id', customerIds),
      supabase.from('proposals').select('id').in('customer_id', customerIds),
    ])
    for (const row of surveys.data || []) pairs.push(['site_survey', row.id])
    for (const row of estimates.data || []) pairs.push(['estimate', row.id])
    for (const row of proposals.data || []) pairs.push(['proposal', row.id])
  }
  return { pairs, customerIds }
}

function humanAction(action: string): string {
  switch (action) {
    case 'created': return 'Created'
    case 'updated': return 'Updated'
    case 'deleted': return 'Deleted'
    case 'status_changed': return 'Status changed'
    case 'sent': return 'Sent'
    case 'signed': return 'Signed'
    case 'paid': return 'Payment recorded'
    case 'note': return 'Note added'
    case 'call': return 'Call logged'
    case 'email_sent': return 'Email sent'
    default: return action
  }
}

export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    const limit = query.limit ?? 200

    let pairs: EntityPair[] = []
    let customerIds: string[] = []

    if (query.company_id) {
      const scope = await collectCompanyScope(context.supabase, query.company_id)
      pairs = scope.pairs
      customerIds = scope.customerIds
    } else if (query.customer_id) {
      const scope = await collectCustomerScope(context.supabase, query.customer_id)
      pairs = scope.pairs
      customerIds = scope.customerIds
    } else if (query.entity_type && query.entity_id) {
      pairs = [[query.entity_type, query.entity_id]]
      if (query.entity_type === 'customer') {
        customerIds = [query.entity_id]
      }
    } else {
      // Recent feed across the org — pull the most recent activity_log
      // rows only; SMS/email get included naturally whenever they're
      // scoped to a specific entity. A firehose join across all three
      // would be expensive and not especially useful.
      const { data } = await context.supabase
        .from('activity_log')
        .select(
          'id, user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, description, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(query.limit ?? 20)
      const feed: FeedEntry[] = (data || []).map((row) => ({
        id: `activity:${row.id}`,
        source: 'activity',
        kind: row.action,
        at: row.created_at,
        actor: row.user_name,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        entity_name: row.entity_name,
        title: row.description || humanAction(row.action),
        subtitle: null,
        body: null,
        meta: {
          old_values: row.old_values,
          new_values: row.new_values,
        },
      }))
      return NextResponse.json({ activity: feed })
    }

    const [activity, sms, email] = await Promise.all([
      fetchActivityLogRows(context.supabase, pairs, limit),
      fetchSmsRows(context.supabase, customerIds, pairs, limit),
      fetchEmailRows(context.supabase, customerIds, pairs, limit),
    ])

    const merged = [...activity, ...sms, ...email]
      .filter((e) => e.at) // drop rows without a usable timestamp
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, limit)

    return NextResponse.json({ activity: merged })
  },
)
