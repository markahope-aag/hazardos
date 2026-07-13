'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, AlertTriangle, Inbox } from 'lucide-react'
import type { SmsDeliveryLogEntry } from '@/types/sms'

const STATUS_OPTIONS = [
  { value: 'problems', label: 'Problems (failed + undelivered)' },
  { value: 'failed', label: 'Failed' },
  { value: 'undelivered', label: 'Undelivered' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'sent', label: 'Sent' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'all', label: 'All statuses' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'appointment_reminder', label: 'Appointment reminder' },
  { value: 'job_status', label: 'Job status' },
  { value: 'lead_notification', label: 'Lead notification' },
  { value: 'payment_reminder', label: 'Payment reminder' },
  { value: 'estimate_follow_up', label: 'Estimate follow-up' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'general', label: 'General' },
]

const FAILURE_STATUSES = new Set(['failed', 'undelivered'])

function statusBadge(status: string) {
  if (FAILURE_STATUSES.has(status)) {
    return <Badge className="bg-red-100 text-red-800">{status}</Badge>
  }
  if (status === 'delivered') {
    return <Badge className="bg-green-100 text-green-800">{status}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

export default function DeliveryLogPage() {
  const [status, setStatus] = useState('problems')
  const [type, setType] = useState('all')
  const [messages, setMessages] = useState<SmsDeliveryLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (status !== 'all') params.set('status', status)
        if (type !== 'all') params.set('message_type', type)
        params.set('limit', '200')
        const res = await fetch(`/api/sms/delivery-log?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load delivery log')
        const data = await res.json()
        if (!cancelled) setMessages(data.messages || [])
      } catch {
        if (!cancelled) setMessages([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status, type])

  return (
    <div className="space-y-4">
      <Link
        href="/messages"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        All conversations
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">SMS Delivery Log</h1>
        <p className="text-gray-600 mt-1">
          Outbound message delivery status and carrier error reasons. Defaults to
          messages that failed or weren&apos;t delivered.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-72">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-600">
                {status === 'problems'
                  ? 'No failed or undelivered messages. Everything got through.'
                  : 'No messages match this filter.'}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {messages.map((m) => {
                const isFailure = FAILURE_STATUSES.has(m.status)
                const ts = m.failed_at ?? m.delivered_at ?? m.sent_at ?? m.queued_at
                const row = (
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">
                          {m.customer_name || m.to_phone}
                        </span>
                        {m.customer_name && (
                          <span className="text-sm text-gray-500 ml-2">{m.to_phone}</span>
                        )}
                      </div>
                      {statusBadge(m.status)}
                    </div>
                    <div className="text-sm text-gray-600 truncate mt-1">{m.body}</div>
                    {isFailure && (m.error_code || m.error_message) && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {m.error_code ? `${m.error_code} ` : ''}
                          {m.error_message || 'Delivery failed'}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(ts).toLocaleString()}
                    </div>
                  </div>
                )
                return (
                  <li key={m.id} className={isFailure ? 'bg-red-50/40' : undefined}>
                    {m.customer_id ? (
                      <Link href={`/messages/${m.customer_id}`} className="block hover:bg-gray-50">
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
