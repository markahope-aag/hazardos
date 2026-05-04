'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import type { OppGenerateInput } from '@/lib/validations/opp'

interface PrefillResponse {
  company: {
    name: string
    license_number: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    contact_name: string | null
    phone: string | null
  }
  property: {
    name: string
    address: string
    city: string | null
    contact_name: string | null
    phone: string | null
  }
  schedule: {
    start_date: string | null
    end_date: string | null
    suggested_shift: 'am' | 'pm' | 'night' | null
  }
  description: string
  defaults: {
    containment?: string
    ventilation?: string
    work_practices?: string
    final_cleaning?: string
  }
}

interface Props {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function emptyForm(): OppGenerateInput {
  return {
    company_name: '',
    company_license_number: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_zip: '',
    company_contact_name: '',
    company_phone: '',
    property_name: '',
    property_address: '',
    property_city: '',
    property_contact_name: '',
    property_phone: '',
    project_start_date: todayIso(),
    project_end_date: todayIso(),
    shift_am: false,
    shift_pm: false,
    shift_night: false,
    project_description: '',
    containment: '',
    ventilation: '',
    work_practices: '',
    final_cleaning: '',
  }
}

export function OppGeneratorModal({ jobId, open, onOpenChange }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<OppGenerateInput>(emptyForm)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/jobs/${jobId}/opp/prefill`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load prefill data')
        return (await res.json()) as PrefillResponse
      })
      .then((data) => {
        if (cancelled) return
        const start = data.schedule.start_date || todayIso()
        const end = data.schedule.end_date || start
        setForm({
          company_name: data.company.name || '',
          company_license_number: data.company.license_number || '',
          company_address: data.company.address || '',
          company_city: data.company.city || '',
          company_state: data.company.state || '',
          company_zip: data.company.zip || '',
          company_contact_name: data.company.contact_name || '',
          company_phone: data.company.phone || '',
          property_name: data.property.name || '',
          property_address: data.property.address || '',
          property_city: data.property.city || '',
          property_contact_name: data.property.contact_name || '',
          property_phone: data.property.phone || '',
          project_start_date: start,
          project_end_date: end,
          shift_am: data.schedule.suggested_shift === 'am',
          shift_pm: data.schedule.suggested_shift === 'pm',
          shift_night: data.schedule.suggested_shift === 'night',
          project_description: data.description || '',
          containment: data.defaults.containment || '',
          ventilation: data.defaults.ventilation || '',
          work_practices: data.defaults.work_practices || '',
          final_cleaning: data.defaults.final_cleaning || '',
        })
      })
      .catch((error) => {
        if (cancelled) return
        toast({
          title: 'Could not load OPP data',
          description: error instanceof Error ? error.message : 'Unexpected error',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, jobId, toast])

  const update = <K extends keyof OppGenerateInput>(key: K, value: OppGenerateInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/opp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate OPP')
      }
      toast({ title: 'OPP generated', description: 'Saved to this job’s documents.' })
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobId] })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Could not generate OPP',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Occupant Protection Plan</DialogTitle>
          <DialogDescription>
            Pre-filled from this job. Review each section, then save the rendered Wisconsin
            DHS-style PDF to the OPP card on this job.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <section>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-700">
                Asbestos Company Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => update('company_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>DHS Company No.</Label>
                  <Input
                    value={form.company_license_number}
                    onChange={(e) => update('company_license_number', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={form.company_address}
                    onChange={(e) => update('company_address', e.target.value)}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={form.company_city}
                    onChange={(e) => update('company_city', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>State</Label>
                    <Input
                      value={form.company_state}
                      onChange={(e) => update('company_state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Zip</Label>
                    <Input
                      value={form.company_zip}
                      onChange={(e) => update('company_zip', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={form.company_contact_name}
                    onChange={(e) => update('company_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Telephone</Label>
                  <Input
                    value={form.company_phone}
                    onChange={(e) => update('company_phone', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-700">
                Asbestos Project Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Property Type or Name</Label>
                  <Input
                    value={form.property_name}
                    onChange={(e) => update('property_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.property_address}
                    onChange={(e) => update('property_address', e.target.value)}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={form.property_city}
                    onChange={(e) => update('property_city', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Property Contact</Label>
                  <Input
                    value={form.property_contact_name}
                    onChange={(e) => update('property_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Telephone</Label>
                  <Input
                    value={form.property_phone}
                    onChange={(e) => update('property_phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Project start date</Label>
                  <Input
                    type="date"
                    value={form.project_start_date}
                    onChange={(e) => update('project_start_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Project end date</Label>
                  <Input
                    type="date"
                    value={form.project_end_date}
                    onChange={(e) => update('project_end_date', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Project work shifts</Label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.shift_am}
                        onCheckedChange={(v) => update('shift_am', v === true)}
                      />
                      AM
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.shift_pm}
                        onCheckedChange={(v) => update('shift_pm', v === true)}
                      />
                      PM
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.shift_night}
                        onCheckedChange={(v) => update('shift_night', v === true)}
                      />
                      Night
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-700">
                Project Description
              </h3>
              <Textarea
                rows={3}
                placeholder="Type of project, type and amount of asbestos-containing material being removed or disturbed."
                value={form.project_description}
                onChange={(e) => update('project_description', e.target.value)}
              />
            </section>

            <section>
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-gray-700">
                Protective Measures
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Defaults pulled from your org settings. Tweak per job as needed.
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Containment or barrier system</Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe negative air system, glovebag, full containment, mini-containment used for barrier."
                    value={form.containment}
                    onChange={(e) => update('containment', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ventilation system shutdown</Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe areas where ventilation system has been shut down."
                    value={form.ventilation}
                    onChange={(e) => update('ventilation', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Work practices</Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe wet methods, debris-lowering system, waste handling methods, etc."
                    value={form.work_practices}
                    onChange={(e) => update('work_practices', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Final cleaning and clearance</Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe air scrubbing, HEPA vacuuming, wet cleaning, encapsulant, air sampling, etc."
                    value={form.final_cleaning}
                    onChange={(e) => update('final_cleaning', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate &amp; save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
