'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarIcon, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { TimeSelect } from '@/components/ui/time-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface Technician {
  id: string
  name: string
  role: string
}

interface SurveyOption {
  id: string
  job_name: string
  scheduled_date: string | null
  status: string
}

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`)
      if (!res.ok) throw new Error('Failed to load job')
      return res.json()
    },
    enabled: !!id,
  })

  const [form, setForm] = useState({
    name: '',
    assigned_to: '',
    site_survey_id: '',
    scheduled_start_date: new Date() as Date | undefined,
    scheduled_start_time: '',
    scheduled_end_date: undefined as Date | undefined,
    estimated_duration_hours: '',
    job_address: '',
    job_city: '',
    job_state: '',
    job_zip: '',
    gate_code: '',
    lockbox_code: '',
    contact_onsite_name: '',
    contact_onsite_phone: '',
    access_notes: '',
    special_instructions: '',
    internal_notes: '',
  })
  const [hydrated, setHydrated] = useState(false)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [surveys, setSurveys] = useState<SurveyOption[]>([])

  useEffect(() => {
    if (!job || hydrated) return
    setForm({
      name: job.name || '',
      assigned_to: job.assigned_to || '',
      site_survey_id: job.site_survey_id || '',
      scheduled_start_date: job.scheduled_start_date ? new Date(job.scheduled_start_date) : new Date(),
      scheduled_start_time: job.scheduled_start_time || '',
      scheduled_end_date: job.scheduled_end_date ? new Date(job.scheduled_end_date) : undefined,
      estimated_duration_hours:
        job.estimated_duration_hours != null ? String(job.estimated_duration_hours) : '',
      job_address: job.job_address || '',
      job_city: job.job_city || '',
      job_state: job.job_state || '',
      job_zip: job.job_zip || '',
      gate_code: job.gate_code || '',
      lockbox_code: job.lockbox_code || '',
      contact_onsite_name: job.contact_onsite_name || '',
      contact_onsite_phone: job.contact_onsite_phone || '',
      access_notes: job.access_notes || '',
      special_instructions: job.special_instructions || '',
      internal_notes: job.internal_notes || '',
    })
    setHydrated(true)
  }, [job, hydrated])

  useEffect(() => {
    async function load() {
      try {
        // Technicians via the team API; surveys go straight to Supabase
        // (no REST endpoint for the surveys list yet; RLS keeps
        // results org-scoped).
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const teamRes = await fetch('/api/team')
        if (teamRes.ok) {
          const data = await teamRes.json()
          const members = (data.members || data.profiles || data || []) as Array<{
            id: string
            full_name?: string
            first_name?: string
            last_name?: string
            role?: string
            is_active?: boolean
          }>
          setTechnicians(
            members
              .filter((m) => m.is_active !== false)
              .filter(
                (m) =>
                  !m.role ||
                  ['technician', 'estimator', 'admin', 'tenant_owner'].includes(m.role),
              )
              .map((m) => ({
                id: m.id,
                role: m.role || 'technician',
                name:
                  m.full_name ||
                  [m.first_name, m.last_name].filter(Boolean).join(' ') ||
                  'Unnamed',
              })),
          )
        }
        if (job?.customer_id) {
          const { data } = await supabase
            .from('site_surveys')
            .select('id, job_name, scheduled_date, status')
            .eq('customer_id', job.customer_id)
            .order('created_at', { ascending: false })
            .limit(100)
          setSurveys((data || []) as SurveyOption[])
        }
      } catch {
        // Best-effort — picker just stays sparse if the lookups fail.
      }
    }
    load()
  }, [job?.customer_id])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        assigned_to: form.assigned_to || undefined,
        site_survey_id: form.site_survey_id || null,
        scheduled_start_date: form.scheduled_start_date
          ? format(form.scheduled_start_date, 'yyyy-MM-dd')
          : undefined,
        scheduled_start_time: form.scheduled_start_time || undefined,
        scheduled_end_date: form.scheduled_end_date
          ? format(form.scheduled_end_date, 'yyyy-MM-dd')
          : undefined,
        estimated_duration_hours: form.estimated_duration_hours
          ? parseFloat(form.estimated_duration_hours)
          : undefined,
        job_address: form.job_address || undefined,
        job_city: form.job_city || undefined,
        job_state: form.job_state || undefined,
        job_zip: form.job_zip || undefined,
        gate_code: form.gate_code || undefined,
        lockbox_code: form.lockbox_code || undefined,
        contact_onsite_name: form.contact_onsite_name || undefined,
        contact_onsite_phone: form.contact_onsite_phone || undefined,
        access_notes: form.access_notes || undefined,
        special_instructions: form.special_instructions || undefined,
        internal_notes: form.internal_notes || undefined,
      }
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const reason =
          typeof body?.error === 'string'
            ? body.error
            : typeof body?.error?.message === 'string'
            ? body.error.message
            : null
        throw new Error(reason || `Save failed (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      toast({ title: 'Job updated' })
      router.push(`/jobs/${id}`)
    },
    onError: (err) => {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: 'Job name is required', variant: 'destructive' })
      return
    }
    if (!form.assigned_to) {
      toast({ title: 'A technician must be assigned', variant: 'destructive' })
      return
    }
    if (!form.job_address.trim()) {
      toast({ title: 'Job address is required', variant: 'destructive' })
      return
    }
    saveMutation.mutate()
  }

  if (isLoading || !hydrated) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to job
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Edit {job?.job_number || 'Job'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Job name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label>Linked Site Survey</Label>
              <select
                value={form.site_survey_id}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, site_survey_id: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">(not linked)</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.job_name}
                    {s.scheduled_date ? ` — ${new Date(s.scheduled_date).toLocaleDateString()}` : ''}
                    {' · '}
                    {s.status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Only shows surveys on this customer. Leave blank if none applies.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assigned Technician *</Label>
              <select
                value={form.assigned_to}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, assigned_to: e.target.value }))
                }
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a technician…</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.role !== 'technician' ? ` (${t.role.replace(/_/g, ' ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.scheduled_start_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.scheduled_start_date
                        ? format(form.scheduled_start_date, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.scheduled_start_date}
                      onSelect={(d) => d && setForm(prev => ({ ...prev, scheduled_start_date: d }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Start Time</Label>
                <TimeSelect
                  value={form.scheduled_start_time}
                  onChange={(v) => setForm(prev => ({ ...prev, scheduled_start_time: v }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.scheduled_end_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.scheduled_end_date
                        ? format(form.scheduled_end_date, 'PPP')
                        : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.scheduled_end_date}
                      onSelect={(d) => setForm(prev => ({ ...prev, scheduled_end_date: d }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Estimated Duration (hours)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.estimated_duration_hours}
                  onChange={(e) =>
                    setForm(prev => ({ ...prev, estimated_duration_hours: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Address *</Label>
              <Input
                value={form.job_address}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, job_address: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={form.job_city}
                onChange={(e) => setForm(prev => ({ ...prev, job_city: e.target.value }))}
                placeholder="City"
              />
              <Input
                value={form.job_state}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, job_state: e.target.value.toUpperCase() }))
                }
                placeholder="State"
                maxLength={2}
              />
              <Input
                value={form.job_zip}
                onChange={(e) => setForm(prev => ({ ...prev, job_zip: e.target.value }))}
                placeholder="ZIP"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access &amp; Onsite Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gate code</Label>
                <Input
                  value={form.gate_code}
                  onChange={(e) => setForm(prev => ({ ...prev, gate_code: e.target.value }))}
                />
              </div>
              <div>
                <Label>Lockbox code</Label>
                <Input
                  value={form.lockbox_code}
                  onChange={(e) => setForm(prev => ({ ...prev, lockbox_code: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Onsite contact name</Label>
                <Input
                  value={form.contact_onsite_name}
                  onChange={(e) => setForm(prev => ({ ...prev, contact_onsite_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Onsite contact phone</Label>
                <Input
                  type="tel"
                  value={form.contact_onsite_phone}
                  onChange={(e) => setForm(prev => ({ ...prev, contact_onsite_phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Access notes</Label>
              <Textarea
                value={form.access_notes}
                onChange={(e) => setForm(prev => ({ ...prev, access_notes: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Special instructions (customer-facing)</Label>
              <Textarea
                value={form.special_instructions}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, special_instructions: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div>
              <Label>Internal notes</Label>
              <Textarea
                value={form.internal_notes}
                onChange={(e) => setForm(prev => ({ ...prev, internal_notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/jobs/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
