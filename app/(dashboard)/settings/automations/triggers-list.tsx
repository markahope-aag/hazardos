'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { Plus, Trash2, Loader2, Zap } from 'lucide-react'
import { jobStatusConfig } from '@/types/jobs'
import type { ActivityKind } from '@/types/follow-ups'

type EventType =
  | 'activity_completed'
  | 'opportunity_stage_changed'
  | 'job_status_changed'
  | 'lab_result_received'
  | 'message_failed'

interface Rule {
  id: string
  event_type: EventType
  activity_type_id: string | null
  outcome_id: string | null
  pipeline_stage_id: string | null
  job_status: string | null
  lab_result: string | null
  message_channel: string | null
  contact_type: string | null
  process_id: string
  is_active: boolean
  process?: { id: string; name: string; is_active: boolean } | null
}

interface Named { id: string; name: string }
interface TypedName extends Named { kind: ActivityKind }

// Phrased as the first half of a sentence the rest of the row completes.
const EVENT_LABELS: Record<EventType, string> = {
  activity_completed: 'A piece of work is completed',
  opportunity_stage_changed: 'An opportunity moves to a stage',
  job_status_changed: 'A job changes status',
  lab_result_received: 'A lab result comes back',
  message_failed: 'A message fails to deliver',
}

const ANY = '__any__'

export function TriggersList() {
  const { toast } = useToast()
  const [rules, setRules] = useState<Rule[]>([])
  const [processes, setProcesses] = useState<Named[]>([])
  const [activityTypes, setActivityTypes] = useState<TypedName[]>([])
  const [outcomes, setOutcomes] = useState<Named[]>([])
  const [stages, setStages] = useState<Named[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [eventType, setEventType] = useState<EventType>('activity_completed')
  const [processId, setProcessId] = useState('')
  const [activityTypeId, setActivityTypeId] = useState(ANY)
  const [outcomeId, setOutcomeId] = useState(ANY)
  const [stageId, setStageId] = useState(ANY)
  const [jobStatus, setJobStatus] = useState(ANY)
  const [labResult, setLabResult] = useState(ANY)
  const [messageChannel, setMessageChannel] = useState(ANY)
  const [contactType, setContactType] = useState(ANY)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, processesRes] = await Promise.all([
        fetch('/api/activity-process-rules'),
        fetch('/api/activity-processes'),
      ])
      if (!rulesRes.ok) throw new Error('Failed to load triggers')
      const rulesData = await rulesRes.json()
      setRules(rulesData.rules ?? [])
      if (processesRes.ok) {
        const p = await processesRes.json()
        setProcesses((p.processes ?? []).map((x: Named) => ({ id: x.id, name: x.name })))
      }
    } catch (error) {
      logger.error({ error: formatError(error, 'TRIGGERS_LOAD') }, 'Failed to load triggers')
      toast({ title: 'Could not load triggers', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/activity-vocabulary')
      .then((r) => r.json())
      .then((d) => {
        setActivityTypes(d.activity_types ?? [])
        setOutcomes(d.activity_outcomes ?? [])
      })
      .catch(() => undefined)
    // This endpoint returns a bare array rather than a wrapped object.
    fetch('/api/pipeline/stages')
      .then((r) => r.json())
      .then((d) => setStages(Array.isArray(d) ? d : []))
      .catch(() => setStages([]))
  }, [])

  const nameOf = (list: Named[], id: string | null) =>
    id ? list.find((x) => x.id === id)?.name ?? 'Unknown' : null

  /** The row's condition in plain words, or null when it applies to anything. */
  const describeCondition = (rule: Rule): string | null => {
    const parts: string[] = []
    const type = nameOf(activityTypes, rule.activity_type_id)
    const outcome = nameOf(outcomes, rule.outcome_id)
    const stage = nameOf(stages, rule.pipeline_stage_id)
    if (type) parts.push(type)
    if (outcome) parts.push(`result is ${outcome}`)
    if (stage) parts.push(stage)
    if (rule.job_status) {
      parts.push(jobStatusConfig[rule.job_status as keyof typeof jobStatusConfig]?.label ?? rule.job_status)
    }
    if (rule.lab_result) parts.push(`result is ${rule.lab_result}`)
    if (rule.message_channel) parts.push(rule.message_channel === 'email' ? 'email' : 'text')
    if (rule.contact_type) parts.push(`${rule.contact_type} contacts only`)
    return parts.length ? parts.join(', ') : null
  }

  const resetForm = () => {
    setEventType('activity_completed')
    setProcessId('')
    setActivityTypeId(ANY)
    setOutcomeId(ANY)
    setStageId(ANY)
    setJobStatus(ANY)
    setLabResult(ANY)
    setMessageChannel(ANY)
    setContactType(ANY)
  }

  const create = async () => {
    if (!processId) return
    setSaving(true)
    const orNull = (v: string) => (v === ANY ? null : v)
    try {
      const res = await fetch('/api/activity-process-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          process_id: processId,
          contact_type: orNull(contactType),
          // Only the qualifiers this event type accepts are sent. The others
          // would be rejected, and rightly so.
          activity_type_id: eventType === 'activity_completed' ? orNull(activityTypeId) : null,
          outcome_id: eventType === 'activity_completed' ? orNull(outcomeId) : null,
          pipeline_stage_id: eventType === 'opportunity_stage_changed' ? orNull(stageId) : null,
          job_status: eventType === 'job_status_changed' ? orNull(jobStatus) : null,
          lab_result: eventType === 'lab_result_received' ? orNull(labResult) : null,
          message_channel: eventType === 'message_failed' ? orNull(messageChannel) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not create the trigger')
      }
      resetForm()
      setOpen(false)
      await load()
    } catch (error) {
      toast({
        title: 'Could not create it',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/activity-process-rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove')
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      toast({ title: 'Could not remove that trigger', variant: 'destructive' })
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<EventType, Rule[]>()
    for (const rule of rules) {
      if (!map.has(rule.event_type)) map.set(rule.event_type, [])
      map.get(rule.event_type)!.push(rule)
    }
    return [...map.entries()]
  }, [rules])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Triggers</CardTitle>
          <CardDescription>
            What makes an automation run. Leave a condition on "any" to match everything,
            or narrow it to a particular type, result or customer segment.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={processes.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              New trigger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New trigger</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>When this happens</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_LABELS) as EventType[]).map((e) => (
                      <SelectItem key={e} value={e}>{EVENT_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {eventType === 'activity_completed' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type of work</Label>
                    <Select value={activityTypeId} onValueChange={setActivityTypeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>Any</SelectItem>
                        {activityTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Result</Label>
                    <Select value={outcomeId} onValueChange={setOutcomeId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ANY}>Any</SelectItem>
                        {outcomes.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {eventType === 'opportunity_stage_changed' && (
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>Any</SelectItem>
                      {stages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {eventType === 'job_status_changed' && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={jobStatus} onValueChange={setJobStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>Any</SelectItem>
                      {Object.entries(jobStatusConfig).map(([value, cfg]) => (
                        <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {eventType === 'lab_result_received' && (
                <div className="space-y-2">
                  <Label>Result</Label>
                  <Select value={labResult} onValueChange={setLabResult}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>Any</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {eventType === 'message_failed' && (
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={messageChannel} onValueChange={setMessageChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>Any</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Only for</Label>
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Every contact</SelectItem>
                    <SelectItem value="residential">Residential contacts</SelectItem>
                    <SelectItem value="commercial">Commercial contacts</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lets one automation serve both, instead of building it twice.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Run this automation</Label>
                <Select value={processId} onValueChange={setProcessId}>
                  <SelectTrigger><SelectValue placeholder="Choose an automation" /></SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={saving || !processId}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create trigger
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : rules.length === 0 ? (
          <div className="py-10 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Nothing triggers an automation yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {processes.length === 0
                ? 'Build an automation first, then come back and say when it should run.'
                : 'Your automations exist but nothing starts them, so none of them will run.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([event, group]) => (
              <div key={event} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {EVENT_LABELS[event]}
                </h4>
                <ul className="space-y-2">
                  {group.map((rule) => {
                    const condition = describeCondition(rule)
                    return (
                      <li
                        key={rule.id}
                        className="flex items-center gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0 flex-1 text-sm">
                          <span className="text-muted-foreground">
                            {condition ? `${condition} ` : 'Anything '}
                          </span>
                          <span className="text-muted-foreground">runs </span>
                          <span className="font-medium">{rule.process?.name ?? 'a deleted automation'}</span>
                          {rule.process && !rule.process.is_active && (
                            <Badge variant="outline" className="ml-2 border-amber-300 bg-amber-50 text-amber-900">
                              Automation is off
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove trigger"
                          onClick={() => remove(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
