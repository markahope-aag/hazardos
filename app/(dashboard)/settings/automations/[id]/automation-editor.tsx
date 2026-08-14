'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TimeSelect } from '@/components/ui/time-select'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, ArrowDown, ArrowUp, Phone, Mail, MessageSquare, CheckSquare, Plus, Trash2, Loader2,
} from 'lucide-react'
import type { ActivityKind } from '@/types/follow-ups'

interface Process {
  id: string
  name: string
  description: string | null
  is_active: boolean
  use_saturdays: boolean
  use_sundays: boolean
}

interface Step {
  id: string
  sort_order: number
  kind: ActivityKind
  activity_type_id: string | null
  note: string | null
  assignee_mode: 'user' | 'unassigned' | 'current_user'
  assigned_to: string | null
  due_mode: 'immediate' | 'days_at_time' | 'days_hours_minutes'
  due_days: number
  due_time: string | null
  due_hours: number
  due_minutes: number
  reminder_minutes: number | null
  email_template_id: string | null
  sms_template_id: string | null
}

interface Vocabulary {
  activity_types: { id: string; name: string; kind: ActivityKind }[]
}

interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

const KIND_ICON: Record<ActivityKind, typeof Phone> = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  todo: CheckSquare,
}

const KIND_LABEL: Record<ActivityKind, string> = {
  call: 'Make a call',
  email: 'Send an email',
  text: 'Send a text',
  todo: 'To-do',
}

/** Plain-language summary of when a step comes due, shown on the step row. */
function describeTiming(step: Step): string {
  if (step.due_mode === 'immediate') return 'Straight away'
  if (step.due_mode === 'days_at_time') {
    const time = step.due_time ? step.due_time.slice(0, 5) : '00:00'
    return step.due_days === 0 ? `Same day at ${time}` : `${step.due_days} days later at ${time}`
  }
  const parts: string[] = []
  if (step.due_days) parts.push(`${step.due_days} day${step.due_days === 1 ? '' : 's'}`)
  if (step.due_hours) parts.push(`${step.due_hours} hour${step.due_hours === 1 ? '' : 's'}`)
  if (step.due_minutes) parts.push(`${step.due_minutes} min`)
  return parts.length ? `${parts.join(', ')} later` : 'Straight away'
}

export function AutomationEditor({ processId }: { processId: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [process, setProcess] = useState<Process | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [vocabulary, setVocabulary] = useState<Vocabulary>({ activity_types: [] })
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/activity-processes/${processId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setProcess(data.process)
      setSteps(data.steps ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'AUTOMATION_LOAD') }, 'Failed to load automation')
      toast({ title: 'Could not load this automation', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [processId, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/activity-vocabulary')
      .then((r) => r.json())
      .then((d) => setVocabulary({ activity_types: d.activity_types ?? [] }))
      .catch(() => setVocabulary({ activity_types: [] }))
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setMembers([]))
  }, [])

  const patchProcess = async (patch: Partial<Process>) => {
    if (!process) return
    const previous = process
    setProcess({ ...process, ...patch })
    try {
      const res = await fetch(`/api/activity-processes/${processId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not save')
      }
    } catch (error) {
      // Put the switch back rather than leaving the screen claiming something
      // that did not happen. Turning a chain "on" that is still off is exactly
      // the lie that costs someone a week of follow-ups.
      setProcess(previous)
      toast({
        title: 'Not saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const addStep = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/activity-processes/${processId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'todo', due_mode: 'immediate' }),
      })
      if (!res.ok) throw new Error('Could not add a step')
      await load()
    } catch (error) {
      toast({ title: 'Could not add a step', variant: 'destructive' })
      logger.error({ error: formatError(error, 'STEP_ADD') }, 'Failed to add step')
    } finally {
      setBusy(false)
    }
  }

  const patchStep = async (stepId: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)))
    try {
      const res = await fetch(`/api/activity-processes/${processId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not save the step')
      }
      const data = await res.json()
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...data.step } : s)))
    } catch (error) {
      toast({
        title: 'Step not saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
      await load()
    }
  }

  const removeStep = async (stepId: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/activity-processes/${processId}/steps/${stepId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Could not remove the step')
      setSteps((prev) => prev.filter((s) => s.id !== stepId))
    } catch {
      toast({ title: 'Could not remove that step', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= steps.length) return
    const reordered = [...steps]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    setSteps(reordered)
    try {
      const res = await fetch(`/api/activity-processes/${processId}/steps/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_ids: reordered.map((s) => s.id) }),
      })
      if (!res.ok) throw new Error('Could not reorder')
    } catch {
      toast({ title: 'Could not reorder the steps', variant: 'destructive' })
      await load()
    }
  }

  const deleteProcess = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/activity-processes/${processId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not delete')
      }
      router.push('/settings/automations')
    } catch (error) {
      toast({
        title: 'Could not delete it',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const memberName = (m: TeamMember) =>
    [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email

  if (loading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!process) {
    return (
      <div className="max-w-4xl">
        <p className="text-muted-foreground">This automation no longer exists.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/settings/automations">Back to automations</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/settings/automations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Automations
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Input
            value={process.name}
            onChange={(e) => setProcess({ ...process, name: e.target.value })}
            onBlur={(e) => patchProcess({ name: e.target.value })}
            className="h-auto max-w-md border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
            aria-label="Automation name"
          />
          {process.is_active ? (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">On</Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>When this runs</CardTitle>
          <CardDescription>
            Switching it on lets it start creating work. Nothing happens until a rule
            points at it, and a chain with no steps cannot be switched on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="is-active">Automation is on</Label>
              <p className="text-xs text-muted-foreground">
                {steps.length === 0
                  ? 'Add a step first.'
                  : 'New work will be created whenever this chain is triggered.'}
              </p>
            </div>
            <Switch
              id="is-active"
              checked={process.is_active}
              disabled={steps.length === 0}
              onCheckedChange={(checked) => patchProcess({ is_active: checked })}
            />
          </div>

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="use-saturdays">Work Saturdays</Label>
                <p className="text-xs text-muted-foreground">
                  Off means a step landing on a Saturday moves forward.
                </p>
              </div>
              <Switch
                id="use-saturdays"
                checked={process.use_saturdays}
                onCheckedChange={(checked) => patchProcess({ use_saturdays: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="use-sundays">Work Sundays</Label>
                <p className="text-xs text-muted-foreground">
                  Off means a step landing on a Sunday moves forward.
                </p>
              </div>
              <Switch
                id="use-sundays"
                checked={process.use_sundays}
                onCheckedChange={(checked) => patchProcess({ use_sundays: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
          <CardDescription>
            All of these are created at once when the chain runs, each with its own due
            date. Timings count from the moment it starts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No steps yet. Add the first thing that should happen.
            </p>
          ) : (
            steps.map((step, index) => {
              const Icon = KIND_ICON[step.kind] ?? CheckSquare
              const typesForKind = vocabulary.activity_types.filter((t) => t.kind === step.kind)
              return (
                <div key={step.id} className="rounded-md border p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border bg-muted">
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">What happens</Label>
                          <Select
                            value={step.kind}
                            onValueChange={(v) => patchStep(step.id, { kind: v as ActivityKind, activity_type_id: null })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(KIND_LABEL) as ActivityKind[]).map((k) => (
                                <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Which one</Label>
                          <Select
                            value={step.activity_type_id ?? 'none'}
                            onValueChange={(v) =>
                              patchStep(step.id, { activity_type_id: v === 'none' ? null : v })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Pick a type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not specified</SelectItem>
                              {typesForKind.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Who does it</Label>
                          <Select
                            value={step.assignee_mode === 'user' ? step.assigned_to ?? 'unassigned' : step.assignee_mode}
                            onValueChange={(v) => {
                              if (v === 'unassigned' || v === 'current_user') {
                                patchStep(step.id, { assignee_mode: v, assigned_to: null })
                              } else {
                                patchStep(step.id, { assignee_mode: 'user', assigned_to: v })
                              }
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Anyone (unassigned)</SelectItem>
                              <SelectItem value="current_user">Whoever triggered it</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{memberName(m)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">When it is due</Label>
                          <Select
                            value={step.due_mode}
                            onValueChange={(v) =>
                              patchStep(step.id, {
                                due_mode: v as Step['due_mode'],
                                due_time: v === 'days_at_time' ? step.due_time ?? '08:00' : null,
                              })
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Straight away</SelectItem>
                              <SelectItem value="days_at_time">Days later, at a set time</SelectItem>
                              <SelectItem value="days_hours_minutes">A set amount of time later</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {step.due_mode !== 'immediate' && (
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Days</Label>
                            <Input
                              type="number"
                              min={0}
                              max={3650}
                              value={step.due_days}
                              onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, due_days: Number(e.target.value) || 0 } : s))}
                              onBlur={(e) => patchStep(step.id, { due_days: Number(e.target.value) || 0 })}
                            />
                          </div>
                          {step.due_mode === 'days_at_time' ? (
                            <div className="space-y-1">
                              <Label className="text-xs">At</Label>
                              <TimeSelect
                                value={step.due_time ?? '08:00'}
                                onChange={(v) => patchStep(step.id, { due_time: v })}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Hours</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={step.due_hours}
                                  onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, due_hours: Number(e.target.value) || 0 } : s))}
                                  onBlur={(e) => patchStep(step.id, { due_hours: Number(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Minutes</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={59}
                                  value={step.due_minutes}
                                  onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, due_minutes: Number(e.target.value) || 0 } : s))}
                                  onBlur={(e) => patchStep(step.id, { due_minutes: Number(e.target.value) || 0 })}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs">Note for whoever picks this up</Label>
                        <Input
                          value={step.note ?? ''}
                          placeholder="Optional"
                          onChange={(e) => setSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, note: e.target.value } : s))}
                          onBlur={(e) => patchStep(step.id, { note: e.target.value || null })}
                        />
                      </div>

                      {(step.kind === 'email' || step.kind === 'text') && (
                        <p className={cn(
                          'rounded border px-3 py-2 text-xs',
                          (step.kind === 'email' ? step.email_template_id : step.sms_template_id)
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                        )}>
                          {(step.kind === 'email' ? step.email_template_id : step.sms_template_id)
                            ? 'This step sends automatically.'
                            : 'No template chosen yet, so this will appear as a task for someone to send by hand.'}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">{describeTiming(step)}</p>
                    </div>

                    <div className="flex flex-shrink-0 flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move step up"
                        disabled={index === 0 || busy}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move step down"
                        disabled={index === steps.length - 1 || busy}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove step"
                        disabled={busy}
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          <Button variant="outline" onClick={addStep} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add a step
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={deleteProcess} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete this automation
        </Button>
      </div>
    </div>
  )
}
