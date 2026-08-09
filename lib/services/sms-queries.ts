import { createClient } from '@/lib/supabase/server';
import { throwDbError } from '@/lib/utils/secure-error-handler';
import type { SmsMessage, SmsDeliveryLogEntry } from '@/types/sms';

/**
 * Read-only SMS history: message list, delivery log and the conversation
 * inbox. Split out of sms-service.ts, which had grown past the 800-line limit
 * with these three queries accounting for a fifth of it.
 *
 * They share nothing with the send path except the tables they read, which is
 * what makes this a clean boundary: no Twilio client, no consent rules, no
 * writes.
 */

export async function getMessages(
  organizationId: string,
  filters?: {
    customer_id?: string;
    status?: string;
    message_type?: string;
    limit?: number;
  }
): Promise<SmsMessage[]> {
  const supabase = await createClient();

  let query = supabase
    .from('sms_messages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('queued_at', { ascending: false });

  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.message_type) query = query.eq('message_type', filters.message_type);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throwDbError(error, 'fetch SMS messages');
  return data || [];
}

/**
 * Delivery log (SMS11): outbound message history with delivery status and
 * carrier error reasons, enriched with customer names. Defaults to failed +
 * undelivered so "what didn't get through?" is one filter away, but any
 * status (or all) can be requested.
 */
export async function getDeliveryLog(
  organizationId: string,
  filters?: { status?: string; message_type?: string; limit?: number }
): Promise<SmsDeliveryLogEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from('sms_messages')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('direction', 'outbound')
    .order('queued_at', { ascending: false });

  if (filters?.status) {
    // 'problems' is a convenience bucket for the default failed+undelivered
    // view; anything else is treated as an exact status match.
    if (filters.status === 'problems') {
      query = query.in('status', ['failed', 'undelivered']);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.message_type) query = query.eq('message_type', filters.message_type);
  query = query.limit(filters?.limit ?? 100);

  const { data, error } = await query;
  if (error) throwDbError(error, 'fetch SMS delivery log');

  const messages = (data || []) as SmsMessage[];

  const customerIds = [...new Set(
    messages.map((m) => m.customer_id).filter((id): id is string => !!id),
  )];

  const customerMap = new Map<string, string | null>();
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, company_name, first_name, last_name')
      .in('id', customerIds);
    for (const c of customers || []) {
      customerMap.set(
        c.id,
        c.name || c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
      );
    }
  }

  return messages.map((m) => ({
    ...m,
    customer_name: m.customer_id ? customerMap.get(m.customer_id) ?? null : null,
  }));
}

// ========== CONVERSATIONS ==========
//
// The inbox lists one row per customer with the most recent message as a
// preview. The "unread" count is approximated as inbound messages newer
// than the most recent outbound — there isn't (yet) a read/unread column
// because reading is implicit: once staff has replied, the inbound is
// "answered", and if staff hasn't replied, the unread flag stays up.

export async function getConversations(
  organizationId: string,
  options: { search?: string; limit?: number } = {},
): Promise<Array<{
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  last_message_body: string
  last_message_direction: string
  last_message_at: string
  unread_inbound: number
  total_messages: number
}>> {
  const supabase = await createClient()

  // Pull a recent slice, group in code. For the expected scale
  // (thousands of messages, hundreds of customers) this is plenty fast;
  // if it gets slow, move to a SQL window function.
  const { data, error } = await supabase
    .from('sms_messages')
    .select('id, customer_id, from_phone, to_phone, body, direction, queued_at, received_at, sent_at')
    .eq('organization_id', organizationId)
    .order('queued_at', { ascending: false })
    .limit(500)
  if (error) throwDbError(error, 'fetch SMS conversations')

  const threads = new Map<string, typeof data[number][]>()
  for (const msg of data || []) {
    // Conversations are keyed by customer_id if we have one, otherwise by
    // the "other side" phone number so raw inbound messages from unknown
    // senders still show up instead of disappearing.
    const key = msg.customer_id
      ?? (msg.direction === 'inbound' ? msg.from_phone : msg.to_phone)
      ?? 'unknown'
    const list = threads.get(key) ?? []
    list.push(msg)
    threads.set(key, list)
  }

  const customerIds = [...new Set(
    (data || []).map((m) => m.customer_id).filter((id): id is string => !!id),
  )]

  const customerMap = new Map<string, { name: string | null; phone: string | null }>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, company_name, phone, mobile_phone, first_name, last_name')
      .in('id', customerIds)
    for (const c of customers || []) {
      customerMap.set(c.id, {
        name: c.name || c.company_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
        phone: c.phone || c.mobile_phone || null,
      })
    }
  }

  const conversations = [...threads.entries()].map(([key, msgs]) => {
    const sorted = [...msgs].sort((a, b) => {
      const at = a.received_at ?? a.sent_at ?? a.queued_at
      const bt = b.received_at ?? b.sent_at ?? b.queued_at
      return String(bt).localeCompare(String(at))
    })
    const last = sorted[0]
    const customer = last.customer_id ? customerMap.get(last.customer_id) : undefined

    // Unread = inbound messages queued after the most recent outbound.
    let unread = 0
    for (const m of sorted) {
      if (m.direction === 'outbound') break
      unread++
    }

    return {
      customer_id: last.customer_id,
      customer_name: customer?.name ?? null,
      customer_phone:
        customer?.phone
        ?? (last.direction === 'inbound' ? last.from_phone : last.to_phone)
        ?? (key === 'unknown' ? null : key),
      last_message_body: last.body,
      last_message_direction: last.direction,
      last_message_at: last.received_at ?? last.sent_at ?? last.queued_at,
      unread_inbound: unread,
      total_messages: sorted.length,
    }
  })

  const searchLower = options.search?.toLowerCase().trim()
  const filtered = searchLower
    ? conversations.filter((c) =>
        (c.customer_name || '').toLowerCase().includes(searchLower)
        || (c.customer_phone || '').includes(searchLower)
        || c.last_message_body.toLowerCase().includes(searchLower),
      )
    : conversations

  filtered.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
  return options.limit ? filtered.slice(0, options.limit) : filtered
}
