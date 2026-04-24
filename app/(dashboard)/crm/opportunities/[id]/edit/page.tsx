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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PipelineStage {
  id: string
  name: string
  color: string
  probability: number
}

/**
 * Edit an existing opportunity. Scoped to the fields that actually
 * change post-creation — customer and stage are set elsewhere (the
 * kanban handles stage moves; customer is immutable without destroying
 * the activity trail).
 */
export default function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const res = await fetch('/api/pipeline/stages')
      if (!res.ok) return [] as PipelineStage[]
      return (await res.json()) as PipelineStage[]
    },
  })

  const [form, setForm] = useState({
    name: '',
    description: '',
    stage_id: '',
    estimated_value: '',
    expected_close_date: undefined as Date | undefined,
    hazard_type: '' as '' | 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other',
    urgency: '' as '' | 'routine' | 'urgent' | 'emergency',
    property_type: '' as '' | 'residential_single_family' | 'residential_multi_family' | 'commercial' | 'industrial' | 'government',
    property_age: '',
    regulatory_trigger: '' as '' | 'inspection_required' | 'sale_pending' | 'tenant_complaint' | 'voluntary',
    estimated_affected_area_sqft: '',
    service_address_line1: '',
    service_city: '',
    service_state: '',
    service_zip: '',
  })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!opp || hydrated) return
    setForm({
      name: opp.name || '',
      description: opp.description || '',
      stage_id: opp.stage_id || '',
      estimated_value: opp.estimated_value != null ? String(opp.estimated_value) : '',
      expected_close_date: opp.expected_close_date ? new Date(opp.expected_close_date) : undefined,
      hazard_type: (Array.isArray(opp.hazard_types) && opp.hazard_types[0]) || '',
      urgency: opp.urgency || '',
      property_type: opp.property_type || '',
      property_age: opp.property_age != null ? String(opp.property_age) : '',
      regulatory_trigger: opp.regulatory_trigger || '',
      estimated_affected_area_sqft:
        opp.estimated_affected_area_sqft != null ? String(opp.estimated_affected_area_sqft) : '',
      service_address_line1: opp.service_address_line1 || '',
      service_city: opp.service_city || '',
      service_state: opp.service_state || '',
      service_zip: opp.service_zip || '',
    })
    setHydrated(true)
  }, [opp, hydrated])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description || undefined,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
        expected_close_date: form.expected_close_date
          ? format(form.expected_close_date, 'yyyy-MM-dd')
          : undefined,
        hazard_types: form.hazard_type ? [form.hazard_type] : undefined,
        urgency: form.urgency || undefined,
        property_type: form.property_type || undefined,
        property_age: form.property_age ? parseInt(form.property_age, 10) : undefined,
        regulatory_trigger: form.regulatory_trigger || undefined,
        estimated_affected_area_sqft: form.estimated_affected_area_sqft
          ? parseFloat(form.estimated_affected_area_sqft)
          : undefined,
        service_address_line1: form.service_address_line1 || undefined,
        service_city: form.service_city || undefined,
        service_state: form.service_state || undefined,
        service_zip: form.service_zip || undefined,
      }
      // Stage changes go through the dedicated move endpoint so
      // outcome / actual_close_date / stage history all stay consistent.
      if (form.stage_id && form.stage_id !== opp?.stage_id) {
        const moveRes = await fetch(`/api/pipeline/${id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage_id: form.stage_id }),
        })
        if (!moveRes.ok) throw new Error('Failed to move stage')
      }
      const res = await fetch(`/api/pipeline/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Save failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      toast({ title: 'Opportunity updated' })
      router.push(`/crm/opportunities/${id}`)
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
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    saveMutation.mutate()
  }

  if (isLoading || !hydrated) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/crm/opportunities/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to opportunity
      </Link>

      <h1 className="text-2xl font-bold mb-6">Edit Opportunity</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Pipeline Stage</Label>
              <Select
                value={form.stage_id}
                onValueChange={(v) => setForm(prev => ({ ...prev, stage_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name} ({s.probability}%)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Hazard &amp; Scope</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hazard</Label>
                <Select
                  value={form.hazard_type}
                  onValueChange={(v) =>
                    setForm(prev => ({ ...prev, hazard_type: v as typeof prev.hazard_type }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asbestos">Asbestos</SelectItem>
                    <SelectItem value="mold">Mold</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="vermiculite">Vermiculite</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgency</Label>
                <Select
                  value={form.urgency}
                  onValueChange={(v) =>
                    setForm(prev => ({ ...prev, urgency: v as typeof prev.urgency }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Property Type</Label>
                <Select
                  value={form.property_type}
                  onValueChange={(v) =>
                    setForm(prev => ({ ...prev, property_type: v as typeof prev.property_type }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential_single_family">Residential (Single Family)</SelectItem>
                    <SelectItem value="residential_multi_family">Residential (Multi-Family)</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year Built</Label>
                <Input
                  type="number"
                  value={form.property_age}
                  onChange={(e) => setForm(prev => ({ ...prev, property_age: e.target.value }))}
                  placeholder="e.g., 1978"
                  min={1700}
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Regulatory Trigger</Label>
                <Select
                  value={form.regulatory_trigger}
                  onValueChange={(v) =>
                    setForm(prev => ({ ...prev, regulatory_trigger: v as typeof prev.regulatory_trigger }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection_required">Inspection Required</SelectItem>
                    <SelectItem value="sale_pending">Sale Pending</SelectItem>
                    <SelectItem value="tenant_complaint">Tenant Complaint</SelectItem>
                    <SelectItem value="voluntary">Voluntary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Affected Area (sq ft)</Label>
                <Input
                  type="number"
                  value={form.estimated_affected_area_sqft}
                  onChange={(e) =>
                    setForm(prev => ({ ...prev, estimated_affected_area_sqft: e.target.value }))
                  }
                  min={0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Site Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={form.service_address_line1}
              onChange={(e) => setForm(prev => ({ ...prev, service_address_line1: e.target.value }))}
              placeholder="Street address"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={form.service_city}
                onChange={(e) => setForm(prev => ({ ...prev, service_city: e.target.value }))}
                placeholder="City"
              />
              <Input
                value={form.service_state}
                onChange={(e) =>
                  setForm(prev => ({ ...prev, service_state: e.target.value.toUpperCase() }))
                }
                placeholder="State"
                maxLength={2}
              />
              <Input
                value={form.service_zip}
                onChange={(e) => setForm(prev => ({ ...prev, service_zip: e.target.value }))}
                placeholder="ZIP"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Value &amp; Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Value ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.estimated_value}
                  onChange={(e) => setForm(prev => ({ ...prev, estimated_value: e.target.value }))}
                />
              </div>
              <div>
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.expected_close_date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.expected_close_date
                        ? format(form.expected_close_date, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.expected_close_date}
                      onSelect={(date) =>
                        setForm(prev => ({ ...prev, expected_close_date: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/crm/opportunities/${id}`}>Cancel</Link>
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
