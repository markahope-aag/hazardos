'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity, Plus, Pencil, Trash2, ArrowRightLeft, Send, CheckCircle, DollarSign,
  MessageSquare, Phone,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLogEntry {
  id: string
  user_id: string | null
  user_name: string | null
  action: string
  entity_type: string
  entity_id: string
  entity_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  description: string | null
  created_at: string
}

// Either entityType+entityId (activity for one specific row) OR
// customerId (aggregate activity across everything owned by a contact —
// the contact itself + their surveys/estimates/proposals/jobs/opps).
type Props = {
  title?: string
  limit?: number
} & (
  | { entityType: string; entityId: string; customerId?: never }
  | { entityType?: never; entityId?: never; customerId: string }
)

const ACTION_ICON: Record<string, typeof Activity> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  status_changed: ArrowRightLeft,
  sent: Send,
  signed: CheckCircle,
  paid: DollarSign,
  note: MessageSquare,
  call: Phone,
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
}

function describeChanges(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): string | null {
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

export default function EntityActivityFeed(props: Props) {
  const { title = 'Activity', limit } = props
  const entityType = 'entityType' in props ? props.entityType : undefined
  const entityId = 'entityId' in props ? props.entityId : undefined
  const customerId = 'customerId' in props ? props.customerId : undefined
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams()
        if (customerId) {
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
  }, [entityType, entityId, customerId, limit])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const Icon = ACTION_ICON[e.action] || Activity
              const tint = ACTION_TINT[e.action] || 'bg-gray-100 text-gray-700'
              const diff = e.action === 'updated' ? describeChanges(e.old_values, e.new_values) : null
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${tint}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">{e.user_name || 'System'}</span>{' '}
                      <span className="text-gray-600">{humanAction(e.action)}</span>
                      {e.entity_name && (
                        <>
                          {' '}
                          <span className="font-medium">{e.entity_name}</span>
                        </>
                      )}
                      {e.description && <span className="text-gray-600"> — {e.description}</span>}
                    </div>
                    {diff && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{diff}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
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
    default: return action
  }
}
