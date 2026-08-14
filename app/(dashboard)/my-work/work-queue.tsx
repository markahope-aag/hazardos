'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, endOfDay, format, isBefore, startOfDay } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { Phone, Mail, MessageSquare, CheckSquare, Check, AlertTriangle } from 'lucide-react'
import type { ActivityKind, ActivityOutcome, FollowUpQueueItem } from '@/types/follow-ups'

interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

// Each kind gets its own mark so a long list can be scanned by shape rather
// than read word by word. The office works this screen all day.
const KIND_META: Record<ActivityKind, { icon: typeof Phone; label: string; className: string }> = {
  call: { icon: Phone, label: 'Call', className: 'text-sky-700 bg-sky-50 border-sky-200' },
  email: { icon: Mail, label: 'Email', className: 'text-violet-700 bg-violet-50 border-violet-200' },
  text: { icon: MessageSquare, label: 'Text', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  todo: { icon: CheckSquare, label: 'To-do', className: 'text-slate-700 bg-slate-100 border-slate-200' },
}

type Window = 'overdue' | 'today' | 'week' | 'open' | 'completed'

const WINDOW_LABELS: Record<Window, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Next 7 days',
  open: 'All open',
  completed: 'Completed',
}

function windowToQuery(window: Window): Record<string, string> {
  const now = new Date()
  switch (window) {
    case 'overdue':
      return { state: 'pending', due_before: now.toISOString() }
    case 'today':
      return { state: 'pending', due_before: endOfDay(now).toISOString() }
    case 'week':
      return {
        state: 'pending',
        due_after: startOfDay(now).toISOString(),
        due_before: endOfDay(addDays(now, 7)).toISOString(),
      }
    case 'completed':
      return { state: 'completed' }
    case 'open':
    default:
      return { state: 'pending' }
  }
}

export function WorkQueue() {
  const { toast } = useToast()
  const { user, organization } = useMultiTenantAuth()

  const [window, setWindow] = useState<Window>('today')
  const [assignee, setAssignee] = useState<string>('me')
  const [kind, setKind] = useState<string>('all')
  const [items, setItems] = useState<FollowUpQueueItem[]>([])
  const [outcomes, setOutcomes] = useState<ActivityOutcome[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        include_entity: 'true',
        limit: '100',
        ...windowToQuery(window),
      })
      if (assignee === 'me') params.set('assigned_to', user.id)
      else if (assignee !== 'all') params.set('assigned_to', assignee)
      if (kind !== 'all') params.set('kind', kind)

      const res = await fetch(`/api/follow-ups?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load work queue')
      const data = await res.json()
      setItems(data.follow_ups ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'WORK_QUEUE_FETCH') }, 'Failed to load work queue')
      toast({
        title: 'Could not load your work',
        description: 'Try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [window, assignee, kind, user?.id, toast])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    fetch('/api/activity-vocabulary')
      .then((r) => r.json())
      .then((d) => setOutcomes(d.activity_outcomes ?? []))
      .catch(() => setOutcomes([]))
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setMembers([]))
  }, [])

  const complete = async (item: FollowUpQueueItem, outcomeId: string) => {
    setCompleting(item.id)
    try {
      const res = await fetch(`/api/follow-ups/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, outcome_id: outcomeId }),
      })
      if (!res.ok) throw new Error('Failed to complete')
      // Drop it from the list rather than refetching: the row has left this
      // window, and a refetch would reshuffle everything under the cursor
      // while someone is working down the list.
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (error) {
      logger.error({ error: formatError(error, 'WORK_QUEUE_COMPLETE') }, 'Failed to complete item')
      toast({ title: 'Could not complete that', variant: 'destructive' })
    } finally {
      setCompleting(null)
    }
  }

  const overdueCount = useMemo(
    () => items.filter((i) => !i.completed_at && isBefore(new Date(i.due_date), new Date())).length,
    [items]
  )

  const memberName = (m: TeamMember) =>
    [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={window} onValueChange={(v) => setWindow(v as Window)}>
          <SelectTrigger className="w-[160px]" aria-label="Date window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WINDOW_LABELS) as Window[]).map((w) => (
              <SelectItem key={w} value={w}>{WINDOW_LABELS[w]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-[180px]" aria-label="Assigned to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="me">Assigned to me</SelectItem>
            <SelectItem value="all">Everyone</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[140px]" aria-label="Type of work">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every type</SelectItem>
            {(Object.keys(KIND_META) as ActivityKind[]).map((k) => (
              <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {overdueCount > 0 && (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            {overdueCount} overdue
          </Badge>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Check className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <p className="font-medium">Nothing {WINDOW_LABELS[window].toLowerCase()}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {organization?.name ? `${organization.name} is clear for now.` : 'You are clear for now.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const meta = KIND_META[item.kind] ?? KIND_META.todo
            const Icon = meta.icon
            const due = new Date(item.due_date)
            const isOverdue = !item.completed_at && isBefore(due, new Date())
            return (
              <li key={item.id}>
                <Card className={cn(isOverdue && 'border-red-200')}>
                  <CardContent className="flex flex-wrap items-start gap-4 py-4">
                    <span
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border',
                        meta.className
                      )}
                      title={meta.label}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {item.activity_type?.name || item.note || meta.label}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {item.entity ? (
                          <Link href={item.entity.href} className="text-primary hover:underline">
                            {item.entity.label}
                          </Link>
                        ) : (
                          <span className="italic">Record no longer available</span>
                        )}
                        <span className={cn(isOverdue && 'font-medium text-red-700')}>
                          {isOverdue ? 'Was due ' : 'Due '}
                          {format(due, 'EEE d MMM, h:mm a')}
                        </span>
                        {item.source === 'process' && (
                          <Badge variant="outline" className="text-[10px]">Automated</Badge>
                        )}
                      </div>
                      {item.activity_type?.name && item.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                      )}
                    </div>

                    {item.completed_at ? (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                        {item.outcome?.name || 'Completed'}
                      </Badge>
                    ) : (
                      <Select
                        disabled={completing === item.id}
                        onValueChange={(outcomeId) => complete(item, outcomeId)}
                      >
                        <SelectTrigger className="w-[190px]" aria-label={`Complete: ${item.activity_type?.name || 'work item'}`}>
                          <SelectValue placeholder={completing === item.id ? 'Saving…' : 'Mark done…'} />
                        </SelectTrigger>
                        <SelectContent>
                          {outcomes.map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
