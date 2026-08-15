'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { Check, X, Loader2, ClipboardCheck } from 'lucide-react'
import type { TimeClockEntry } from '@/types/time-clock'

function formatHours(entry: TimeClockEntry): string {
  if (!entry.clock_out) return '—'
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()
  return (ms / 3_600_000).toFixed(2)
}

function techName(entry: TimeClockEntry): string {
  const p = entry.profile
  if (!p) return 'Unknown'
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
}

/**
 * Supervisor review queue. Grouped by technician since the client asked for
 * approval "before weekly submission" — reviewing one person's whole week
 * together is the natural unit, not a firehose of individual clock-ins.
 */
export default function TimeClockApprovalsPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<TimeClockEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/time-clock/approvals')
      if (!res.ok) throw new Error('Failed to load submitted entries')
      const data = await res.json()
      setEntries(data.entries ?? [])
      setSelected(new Set())
    } catch (error) {
      logger.error({ error: formatError(error, 'TIME_CLOCK_APPROVALS_LOAD') }, 'Failed to load submitted entries')
      toast({ title: 'Could not load submitted time', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const byTech = new Map<string, TimeClockEntry[]>()
    for (const e of entries) {
      const key = e.profile_id
      if (!byTech.has(key)) byTech.set(key, [])
      byTech.get(key)!.push(e)
    }
    return [...byTech.entries()]
  }, [entries])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllForTech = (techEntries: TimeClockEntry[]) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = techEntries.every((e) => next.has(e.id))
      for (const e of techEntries) {
        if (allSelected) next.delete(e.id)
        else next.add(e.id)
      }
      return next
    })
  }

  const review = async (action: 'approve' | 'reject', entryIds: string[]) => {
    if (entryIds.length === 0) return
    const notes = action === 'reject' ? window.prompt('Reason for rejecting? (optional)') ?? undefined : undefined
    setActing(true)
    try {
      const res = await fetch('/api/time-clock/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: entryIds, action, notes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Failed to ${action}`)
      }
      toast({ title: action === 'approve' ? 'Approved' : 'Rejected' })
      await load()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action}`,
        variant: 'destructive',
      })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Approvals</h1>
        <p className="text-muted-foreground">
          Submitted hours waiting on review before they count toward the week.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nothing waiting on you</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Submitted timesheets show up here for approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([profileId, techEntries]) => {
          const selectedForTech = techEntries.filter((e) => selected.has(e.id)).map((e) => e.id)
          const totalHours = techEntries.reduce(
            (sum, e) => sum + (e.clock_out ? new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime() : 0),
            0
          ) / 3_600_000

          return (
            <Card key={profileId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{techName(techEntries[0])}</CardTitle>
                  <CardDescription>{totalHours.toFixed(2)} hrs · {techEntries.length} entries</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={acting}
                    onClick={() => review('reject', selectedForTech.length ? selectedForTech : techEntries.map((e) => e.id))}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject{selectedForTech.length ? ` (${selectedForTech.length})` : ' All'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() => review('approve', selectedForTech.length ? selectedForTech : techEntries.map((e) => e.id))}
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Approve{selectedForTech.length ? ` (${selectedForTech.length})` : ' All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAllForTech(techEntries)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {techEntries.every((e) => selected.has(e.id)) ? 'Deselect all' : 'Select all'}
                </button>
                {techEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                    <Checkbox
                      checked={selected.has(e.id)}
                      onCheckedChange={() => toggle(e.id)}
                      aria-label={`Select entry for ${new Date(e.clock_in).toLocaleDateString()}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {new Date(e.clock_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {e.job ? ` · ${e.job.job_number}` : ' · General'}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(e.clock_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {' – '}
                        {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{formatHours(e)} hrs</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
