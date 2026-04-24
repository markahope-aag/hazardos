'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { TimeSelect } from '@/components/ui/time-select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CustomerCombobox } from '@/components/customers/customer-combobox'
import { ArrowLeft, CalendarIcon, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const proposalId = searchParams.get('proposal_id')
  const customerId = searchParams.get('customer_id')
  const estimateId = searchParams.get('estimate_id')
  const opportunityId = searchParams.get('opportunity_id')
  const defaultDate = searchParams.get('date')
  // Pre-populated address pieces when coming in from an opportunity or
  // estimate. The form still lets users edit these.
  const jobAddressParam = searchParams.get('job_address')
  const jobCityParam = searchParams.get('job_city')
  const jobStateParam = searchParams.get('job_state')
  const jobZipParam = searchParams.get('job_zip')
  const nameParam = searchParams.get('name')

  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [surveys, setSurveys] = useState<Array<{
    id: string
    job_name: string
    scheduled_date: string | null
    status: string
  }>>([])

  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    proposal_id: proposalId || '',
    opportunity_id: opportunityId || '',
    site_survey_id: '',
    assigned_to: '',
    scheduled_start_date: defaultDate ? new Date(defaultDate) : new Date(),
    scheduled_end_date: undefined as Date | undefined,
    scheduled_start_time: '',
    estimated_duration_hours: '',
    job_address: jobAddressParam || '',
    job_city: jobCityParam || '',
    job_state: jobStateParam || '',
    job_zip: jobZipParam || '',
    access_notes: '',
    special_instructions: '',
    name: nameParam || '',
  })

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers?limit=500')
        const data = await response.json()
        if (data.customers) {
          setCustomers(data.customers)
        } else if (Array.isArray(data)) {
          setCustomers(data)
        }
      } catch (error) {
        logger.error(
          { error: formatError(error, 'CUSTOMERS_FETCH_ERROR') },
          'Failed to fetch customers'
        )
      } finally {
        setLoadingCustomers(false)
      }
    }
    async function fetchTechnicians() {
      try {
        // Everyone on the team who can actually work a job. Admins /
        // tenant owners also land in the list — small shops often have
        // one person wearing all three hats.
        const response = await fetch('/api/team')
        if (!response.ok) return
        const data = await response.json()
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
            .filter((m) =>
              !m.role || ['technician', 'estimator', 'admin', 'tenant_owner'].includes(m.role),
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
      } catch (error) {
        logger.error(
          { error: formatError(error, 'TECHNICIANS_FETCH_ERROR') },
          'Failed to fetch technicians',
        )
      }
    }
    fetchCustomers()
    fetchTechnicians()
  }, [])

  // Auto-fill address from the pre-selected customer when the form
  // opens with ?customer_id set and the query params didn't already
  // supply an address (e.g. old opportunities without service_*).
  useEffect(() => {
    if (!customerId || !customers.length) return
    const customer = customers.find((c) => c.id === customerId)
    if (!customer) return
    setFormData((prev) => ({
      ...prev,
      job_address: prev.job_address || customer.address_line1 || '',
      job_city: prev.job_city || customer.city || '',
      job_state: prev.job_state || customer.state || '',
      job_zip: prev.job_zip || customer.zip || '',
    }))
  }, [customerId, customers])

  // Pull this customer's surveys so the picker only offers realistic
  // candidates (instead of every survey in the org). There's no REST
  // endpoint for the surveys list yet, so we query Supabase directly
  // — RLS keeps results org-scoped.
  useEffect(() => {
    if (!formData.customer_id) {
      setSurveys([])
      return
    }
    async function load() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase
          .from('site_surveys')
          .select('id, job_name, scheduled_date, status')
          .eq('customer_id', formData.customer_id)
          .order('created_at', { ascending: false })
          .limit(100)
        setSurveys((data || []) as typeof surveys)
      } catch {
        // ignore — picker stays empty
      }
    }
    load()
  }, [formData.customer_id])

  const selectedCustomer = customers.find(c => c.id === formData.customer_id)

  const handleSelectCustomer = (value: string) => {
    const customer = customers.find(c => c.id === value)
    setFormData(prev => ({
      ...prev,
      customer_id: value,
      job_address: prev.job_address || customer?.address_line1 || '',
      job_city: prev.job_city || customer?.city || '',
      job_state: prev.job_state || customer?.state || '',
      job_zip: prev.job_zip || customer?.zip || '',
    }))
  }

  const scheduleDurationDays = formData.scheduled_start_date && formData.scheduled_end_date
    ? Math.round((formData.scheduled_end_date.getTime() - formData.scheduled_start_date.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (!formData.name.trim()) {
      toast({
        title: 'Job name required',
        description: 'Give the job a short name — it prints on the manifest and appears on the calendar.',
        variant: 'destructive',
      })
      return
    }
    if (!formData.job_address) {
      toast({ title: 'Error', description: 'Please enter a job address', variant: 'destructive' })
      return
    }
    if (!formData.assigned_to) {
      toast({
        title: 'Assign a technician',
        description: 'Every job needs a technician assigned before it can be scheduled.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const endpoint = proposalId ? '/api/jobs/from-proposal' : '/api/jobs'
      const body = proposalId
        ? {
            proposal_id: proposalId,
            assigned_to: formData.assigned_to,
            scheduled_start_date: format(formData.scheduled_start_date, 'yyyy-MM-dd'),
            scheduled_start_time: formData.scheduled_start_time || undefined,
            estimated_duration_hours: formData.estimated_duration_hours
              ? parseFloat(formData.estimated_duration_hours)
              : undefined,
          }
        : {
            customer_id: formData.customer_id,
            estimate_id: estimateId || undefined,
            opportunity_id: formData.opportunity_id || undefined,
            site_survey_id: formData.site_survey_id || undefined,
            assigned_to: formData.assigned_to,
            scheduled_start_date: format(formData.scheduled_start_date, 'yyyy-MM-dd'),
            scheduled_end_date: formData.scheduled_end_date
              ? format(formData.scheduled_end_date, 'yyyy-MM-dd')
              : undefined,
            scheduled_start_time: formData.scheduled_start_time || undefined,
            estimated_duration_hours: formData.estimated_duration_hours
              ? parseFloat(formData.estimated_duration_hours)
              : undefined,
            job_address: formData.job_address,
            job_city: formData.job_city || undefined,
            job_state: formData.job_state || undefined,
            job_zip: formData.job_zip || undefined,
            access_notes: formData.access_notes || undefined,
            special_instructions: formData.special_instructions || undefined,
            name: formData.name || undefined,
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const job = await response.json()
      toast({ title: 'Job created', description: `Job ${job.job_number} has been created` })
      router.push(`/jobs/${job.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to jobs">
          <Link href="/jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {proposalId ? 'Schedule Job from Proposal' : 'Create New Job'}
          </h1>
          <p className="text-muted-foreground">
            {proposalId ? 'Schedule a job for the signed proposal' : 'Create a new job and schedule it'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {!proposalId && (
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Customer *</Label>
                  <CustomerCombobox
                    value={formData.customer_id}
                    onValueChange={(v) => handleSelectCustomer(v)}
                    placeholder="Search by name, company, or email..."
                    disabled={loadingCustomers}
                  />
                </div>

                {selectedCustomer && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                    <div className="font-medium">
                      {[selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') || selectedCustomer.name}
                    </div>
                    {selectedCustomer.company_name && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3 w-3" />{selectedCustomer.company_name}
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="text-muted-foreground">{selectedCustomer.email}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Technician is required — every job needs a crew lead
                  before it goes on the schedule. The API also enforces
                  this; the UI validation is the faster feedback loop. */}
              <div className="space-y-2">
                <Label>Assigned Technician *</Label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a technician…</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.role !== 'technician' ? ` (${t.role.replace(/_/g, ' ')})` : ''}
                    </option>
                  ))}
                </select>
                {technicians.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No technicians on the team yet. Add one in{' '}
                    <Link href="/settings/team" className="text-primary hover:underline">
                      Settings → Team
                    </Link>
                    .
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.scheduled_start_date && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_start_date ? format(formData.scheduled_start_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_start_date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, scheduled_start_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <TimeSelect
                    value={formData.scheduled_start_time}
                    onChange={(v) => setFormData(prev => ({ ...prev, scheduled_start_time: v }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.scheduled_end_date && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_end_date ? format(formData.scheduled_end_date, 'PPP') : 'Pick end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_end_date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_end_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end pb-2">
                  {scheduleDurationDays !== null && scheduleDurationDays >= 0 && (
                    <span className="text-sm text-muted-foreground">{scheduleDurationDays} day{scheduleDurationDays !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Duration (hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_duration_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_hours: e.target.value }))}
                  placeholder="e.g., 8"
                />
              </div>
            </CardContent>
          </Card>

          {!proposalId && (
            <Card>
              <CardHeader>
                <CardTitle>Job Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    value={formData.job_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_address: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.job_city}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.job_state}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_state: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={formData.job_zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_zip: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Access Notes</Label>
                  <Textarea
                    value={formData.access_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_notes: e.target.value }))}
                    placeholder="Gate codes, parking instructions, etc."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Job Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Kitchen Renovation - Phase 1"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Shows on the calendar, manifest, and every customer-facing document.
                </p>
              </div>

              {/* Link the job to its originating site survey. The list
                  is scoped to the selected customer so crews can't
                  accidentally pick another customer's survey. */}
              <div className="space-y-2">
                <Label>Linked Site Survey</Label>
                <select
                  value={formData.site_survey_id}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, site_survey_id: e.target.value }))
                  }
                  disabled={!formData.customer_id}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">
                    {formData.customer_id
                      ? surveys.length === 0
                        ? 'No surveys on this customer yet'
                        : '(not linked)'
                      : 'Pick a customer first'}
                  </option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.job_name}
                      {s.scheduled_date ? ` — ${new Date(s.scheduled_date).toLocaleDateString()}` : ''}
                      {' · '}
                      {s.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Carries site + hazard context from the survey into the job. Optional.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="Any special requirements or instructions for the crew"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/jobs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
