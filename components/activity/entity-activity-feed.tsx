'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity, Plus, Pencil, Trash2, ArrowRightLeft, Send, CheckCircle, DollarSign,
  MessageSquare, Phone, Mail, MessageCircle, AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

// Splits the feed into what salespeople usually care about
// (back-and-forth with the client) vs what auditors and admins care
// about (who edited what on the record). Notes and logged calls count
// as communications even though they come from activity_log, because
// from a "what did we talk about?" lens they belong in that group.
const COMMUNICATION_KINDS = new Set([
  'sms_outbound',
  'sms_inbound',
  'email_sent',
  'note',
  'call',
])

type FilterMode = 'communications' | 'changes' | 'all'

const FILTER_OPTIONS: Array<{ value: FilterMode; label: string }> = [
  { value: 'communications', label: 'Communications' },
  { value: 'changes', label: 'Changes' },
  { value: 'all', label: 'All' },
]

function categorizeEntry(entry: FeedEntry): 'communications' | 'changes' {
  return COMMUNICATION_KINDS.has(entry.kind) ? 'communications' : 'changes'
}

// Three shapes the feed can run in:
//   - entityType+entityId — activity for one specific row
//   - customerId — aggregate across a contact (contact + surveys/estimates/
//     proposals/opps/jobs all owned by that contact) + SMS + email
//   - companyId — aggregate across a company (company + its contacts and
//     everything those contacts own, plus jobs/opps keyed directly to the
//     company) + SMS + email
type Props = {
  title?: string
  limit?: number
} & (
  | { entityType: string; entityId: string; customerId?: never; companyId?: never }
  | { entityType?: never; entityId?: never; customerId: string; companyId?: never }
  | { entityType?: never; entityId?: never; customerId?: never; companyId: string }
)

const ACTION_ICON: Record<string, typeof Activity> = {
  // activity_log kinds
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  status_changed: ArrowRightLeft,
  sent: Send,
  signed: CheckCircle,
  paid: DollarSign,
  note: MessageSquare,
  call: Phone,
  email_sent: Mail,
  // sms/email unified kinds
  sms_outbound: MessageCircle,
  sms_inbound: MessageCircle,
}

const ACTION_TINT: Record<string, string> = {
  created: 'bg-green-50 text-green-700',
  updated: 'bg-blue-50 text-blue-700',
  deleted: 'bg-red-50 text-red-700',
  status_changed: 'bg-purple-50 text-purple-700',
  sent: 'bg-indigo-50 text-indigo-700',
  signed: 'bg-teal-50 text-teal-700',
  paid: 'bg-emerald-50 text-emerald-700',
  note: 'bg-amber-50 text-amber-700',
  call: 'bg-sky-50 text-sky-700',
  email_sent: 'bg-orange-50 text-orange-700',
  sms_outbound: 'bg-violet-50 text-violet-700',
  sms_inbound: 'bg-pink-50 text-pink-700',
}

function describeChanges(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined,
): string | null {
  if (!newValues) return null
  const keys = Object.keys(newValues).filter((k) => k !== 'updated_at' && k !== 'id')
  if (keys.length === 0) return null
  if (keys.length <= 3) {
    return keys.map((k) => {
      const prev = oldValues?.[k]
      const next = newValues[k]
      if (prev === undefined) return k
      return `${k}: ${formatValue(prev)} → ${formatValue(next)}`
    }).join(', ')
  }
  return `${keys.length} fields changed`
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v.length > 40 ? v.slice(0, 37) + '…' : v
  if (typeof v === 'boolean' || typeof v === 'number') return String(v)
  return JSON.stringify(v).slice(0, 40)
}

function emailStatusLabel(status: string | undefined): { label: string; tone: 'neutral' | 'ok' | 'warn' | 'bad' } {
  switch (status) {
    case 'delivered': return { label: 'Delivered', tone: 'ok' }
    case 'sent': return { label: 'Sent', tone: 'neutral' }
    case 'bounced': return { label: 'Bounced', tone: 'bad' }
    case 'complained': return { label: 'Marked as spam', tone: 'bad' }
    case 'failed': return { label: 'Failed', tone: 'bad' }
    case 'queued': return { label: 'Queued', tone: 'neutral' }
    default: return { label: status || 'Unknown', tone: 'neutral' }
  }
}

const STATUS_TONE: Record<string, string> = {
  neutral: 'text-gray-500',
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
}

export default function EntityActivityFeed(props: Props) {
  const { title = 'Activity', limit } = props
  const entityType = 'entityType' in props ? props.entityType : undefined
  const entityId = 'entityId' in props ? props.entityId : undefined
  const customerId = 'customerId' in props ? props.customerId : undefined
  const companyId = 'companyId' in props ? props.companyId : undefined
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Default to Communications so the feed reads as a conversation log
  // first. Users who want record-edit history can switch modes.
  const [filter, setFilter] = useState<FilterMode>('communications')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams()
        if (companyId) {
          params.set('company_id', companyId)
        } else if (customerId) {
          params.set('customer_id', customerId)
        } else if (entityType && entityId) {
          params.set('entity_type', entityType)
          params.set('entity_id', entityId)
        }
        const res = await fetch(`/api/activity-log?${params.toString()}`)
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelled) setEntries((data.activity || []).slice(0, limit ?? 100))
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [entityType, entityId, customerId, companyId, limit])

  const counts = {
    communications: entries.filter((e) => categorizeEntry(e) === 'communications').length,
    changes: entries.filter((e) => categorizeEntry(e) === 'changes').length,
    all: entries.length,
  }

  const visibleEntries =
    filter === 'all' ? entries : entries.filter((e) => categorizeEntry(e) === filter)

  const emptyMessage =
    filter === 'communications'
      ? 'No emails, texts, notes, or calls recorded yet.'
      : filter === 'changes'
      ? 'No record changes logged yet.'
      : 'No activity recorded yet.'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            {title}
          </CardTitle>
          {!loading && entries.length > 0 && (
            <div className="flex items-center gap-1 text-xs" role="tablist" aria-label="Activity filter">
              {FILTER_OPTIONS.map((opt) => {
                const count = counts[opt.value]
                const active = filter === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(opt.value)}
                    className={`px-2.5 py-1 rounded-md border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                    <span className={`ml-1.5 ${active ? 'opacity-90' : 'opacity-60'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <ul className="space-y-3">
            {visibleEntries.map((e) => (
              <FeedItem key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function FeedItem({ entry }: { entry: FeedEntry }) {
  const Icon = ACTION_ICON[entry.kind] || Activity
  const tint = ACTION_TINT[entry.kind] || 'bg-gray-100 text-gray-700'

  return (
    <li className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${tint}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        {entry.source === 'activity' && <ActivityBody entry={entry} />}
        {entry.source === 'sms' && <SmsBody entry={entry} />}
        {entry.source === 'email' && <EmailBody entry={entry} />}
        <div className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(entry.at), { addSuffix: true })}
        </div>
      </div>
    </li>
  )
}

function ActivityBody({ entry }: { entry: FeedEntry }) {
  const meta = entry.meta as { old_values?: Record<string, unknown>; new_values?: Record<string, unknown> } | null
  const diff =
    entry.kind === 'updated' ? describeChanges(meta?.old_values, meta?.new_values) : null

  return (
    <>
      <div className="text-sm text-gray-900">
        <span className="font-medium">{entry.actor || 'System'}</span>{' '}
        <span className="text-gray-600">{humanAction(entry.kind)}</span>
        {entry.entity_name && (
          <>
            {' '}
            <span className="font-medium">{entry.entity_name}</span>
          </>
        )}
      </div>
      {diff && (
        <div className="text-xs text-gray-500 mt-0.5 truncate">{diff}</div>
      )}
    </>
  )
}

function SmsBody({ entry }: { entry: FeedEntry }) {
  const meta = entry.meta as { status?: string; direction?: string } | null
  const failed = meta?.status === 'failed' || meta?.status === 'undelivered'
  return (
    <>
      <div className="text-sm text-gray-900 flex items-center gap-2">
        <span className="font-medium">{entry.title}</span>
        {failed && (
          <span className="inline-flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            {meta?.status}
          </span>
        )}
      </div>
      {entry.body && (
        <div className="text-sm text-gray-700 mt-0.5 italic">&ldquo;{entry.body}&rdquo;</div>
      )}
    </>
  )
}

function EmailBody({ entry }: { entry: FeedEntry }) {
  const meta = entry.meta as
    | { status?: string; open_count?: number; bounced_at?: string | null }
    | null
  const status = emailStatusLabel(meta?.status)
  const opens = meta?.open_count ?? 0

  return (
    <>
      <div className="text-sm text-gray-900">
        <span className="font-medium">{entry.title}</span>
      </div>
      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
        {entry.subtitle && <span>{entry.subtitle}</span>}
        <span className={STATUS_TONE[status.tone]}>· {status.label}</span>
        {opens > 0 && <span className="text-gray-500">· Opened {opens}×</span>}
      </div>
    </>
  )
}

function humanAction(action: string): string {
  switch (action) {
    case 'created': return 'created'
    case 'updated': return 'updated'
    case 'deleted': return 'deleted'
    case 'status_changed': return 'changed the status of'
    case 'sent': return 'sent'
    case 'signed': return 'signed'
    case 'paid': return 'recorded payment on'
    case 'note': return 'added a note to'
    case 'call': return 'logged a call on'
    case 'email_sent': return 'sent email about'
    default: return action
  }
}
