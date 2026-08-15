'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import { ROLES } from '@/lib/auth/roles'
import { Clock, Loader2, Play, Square, Send, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import type { TimeClockEntry } from '@/types/time-clock'

interface JobOption {
  id: string
  job_number: string
  job_name: string | null
}

/** Monday-start week containing `date`, as [start, end] local-date strings (YYYY-MM-DD). */
function currentWeekRange(date: Date): { from: string; to: string } {
  const day = date.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { from: monday.toISOString(), to: sunday.toISOString() }
}

function formatHours(ms: number): string {
  return (ms / 3_600_000).toFixed(2)
}

function entryDurationMs(entry: TimeClockEntry, now: number): number {
  const start = new Date(entry.clock_in).getTime()
  const end = entry.clock_out ? new Date(entry.clock_out).getTime() : now
  return Math.max(0, end - start)
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-800 border-blue-200',
  submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
}

export default function TimeClockPage() {
  const { toast } = useToast()
  const { organization, profile } = useMultiTenantAuth()
  const [entries, setEntries] = useState<TimeClockEntry[]>([])
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('none')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const week = useMemo(() => currentWeekRange(new Date()), [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/time-clock?from=${encodeURIComponent(week.from)}&to=${encodeURIComponent(week.to)}`)
      if (!res.ok) throw new Error('Failed to load time clock entries')
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'TIME_CLOCK_LOAD') }, 'Failed to load time clock entries')
      toast({ title: 'Could not load your time clock', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, week.from, week.to])

  useEffect(() => {
    load()
  }, [load])

  // Live-updating duration for whatever is currently open.
  useEffect(() => {
    const openEntry = entries.find((e) => !e.clock_out)
    if (!openEntry) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [entries])

  useEffect(() => {
    if (!organization?.id) return
    const loadJobs = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('jobs')
        .select('id, job_number, job_name')
        .eq('organization_id', organization.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_start_date', { ascending: false })
        .limit(50)
      setJobs(data ?? [])
    }
    loadJobs()
  }, [organization?.id])

  const openEntry = entries.find((e) => !e.clock_out) ?? null
  const closedThisWeek = entries.filter((e) => e.clock_out)
  const totalHoursThisWeek = closedThisWeek.reduce((sum, e) => sum + entryDurationMs(e, now), 0)
  const anyOpenInWeek = entries.some((e) => !e.clock_out)
  // Submittable whenever there's at least one closed-but-not-yet-submitted
  // entry and nothing is still running — matches what the API itself will
  // actually act on (it only touches status='open' rows in range), so this
  // stays enabled even when part of the week was already submitted earlier.
  const hasUnsubmitted = closedThisWeek.some((e) => e.status === 'open')
  const canSubmit = hasUnsubmitted && !anyOpenInWeek

  const handleClockIn = async () => {
    setActing(true)
    try {
      const res = await fetch('/api/time-clock/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId === 'none' ? null : selectedJobId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to clock in')
      }
      toast({ title: 'Clocked in' })
      await load()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive',
      })
    } finally {
      setActing(false)
    }
  }

  const handleClockOut = async () => {
    if (!openEntry) return
    setActing(true)
    try {
      const res = await fetch('/api/time-clock/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: openEntry.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to clock out')
      }
      toast({ title: 'Clocked out' })
      await load()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clock out',
        variant: 'destructive',
      })
    } finally {
      setActing(false)
    }
  }

  const handleSubmitWeek = async () => {
    setActing(true)
    try {
      const res = await fetch('/api/time-clock/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: week.from, to: week.to }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to submit')
      }
      toast({ title: 'Week submitted', description: 'Waiting on approval now.' })
      await load()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit',
        variant: 'destructive',
      })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Clock</h1>
          <p className="text-muted-foreground">
            Clock in generally or against a job. Submit the week when everything&apos;s clocked out —
            {profile?.first_name ? ` ${profile.first_name}, y` : ' y'}our supervisor approves it from there.
          </p>
        </div>
        {ROLES.TENANT_WRITE.includes(profile?.role ?? '') && (
          <Button variant="outline" asChild>
            <Link href="/time-clock/approvals">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Approve Time
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {openEntry ? 'Clocked In' : 'Clock In'}
          </CardTitle>
          {openEntry && (
            <CardDescription>
              Since {new Date(openEntry.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {openEntry.job ? ` — ${openEntry.job.job_number}` : ' — general time'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {openEntry ? (
            <>
              <p className="text-4xl font-bold tabular-nums">{formatHours(entryDurationMs(openEntry, now))} hrs</p>
              <Button onClick={handleClockOut} disabled={acting} size="lg" className="w-full" variant="destructive">
                {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                Clock Out
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="General time (no job)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General time (no job)</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.job_number}{j.job_name ? ` — ${j.job_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleClockIn} disabled={acting} size="lg" className="w-full">
                {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Clock In
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">This Week</CardTitle>
            <CardDescription>{formatHours(totalHoursThisWeek)} hrs total</CardDescription>
          </div>
          <Button onClick={handleSubmitWeek} disabled={!canSubmit || acting} size="sm">
            {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Week
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet this week.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {new Date(e.clock_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {e.job ? ` · ${e.job.job_number}` : ' · General'}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(e.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {e.clock_out
                        ? new Date(e.clock_out).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                        : 'now'}
                    </p>
                    {e.status === 'rejected' && e.review_notes && (
                      <p className="text-red-600 text-xs mt-1">Rejected: {e.review_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums">{formatHours(entryDurationMs(e, now))} hrs</span>
                    <Badge variant="outline" className={STATUS_STYLES[e.status]}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
