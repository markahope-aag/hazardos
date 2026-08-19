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
  description_source:
    | 'estimate_scope'
    | 'estimate_project_description'
    | 'estimate_line_items'
    | 'survey'
    | 'job'
    | 'none'
  description_estimate_number: string | null
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

/**
 * Tell the office where the pre-filled description came from. The whole
 * point of the field is quantities and material type, and only the first
 * two sources actually carry those, so the weaker ones say so plainly.
 */
function describeDescriptionSource(data: PrefillResponse): string | null {
  const estimate = data.description_estimate_number
  switch (data.description_source) {
    case 'estimate_scope':
      return `Pre-filled from the scope of work on ${estimate || 'the estimate'}, which is what the proposal says. Edit if the field conditions changed.`
    case 'estimate_project_description':
      return `Pre-filled from the project description on ${estimate || 'the estimate'}. Check that it names the quantity and the material.`
    case 'estimate_line_items':
      return `Built from the line items on ${estimate || 'the estimate'}. Check the quantities and add the room and dimensions.`
    case 'survey':
      return 'Built from the site survey measurements. No estimate scope of work was found, so add the room and dimensions.'
    case 'job':
      return 'No estimate or survey quantities were found for this job, so this is only the hazard summary. Type in the quantity and material yourself.'
    default:
      return 'Nothing to pre-fill from. Enter the quantity, material type, and location.'
  }
}

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
  const [descriptionHint, setDescriptionHint] = useState<string | null>(null)

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
        setDescriptionHint(describeDescriptionSource(data))
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
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name"
                    value={form.company_name}
                    onChange={(e) => update('company_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dhs-company-no">DHS Company No.</Label>
                  <Input id="dhs-company-no"
                    value={form.company_license_number}
                    onChange={(e) => update('company_license_number', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address"
                    value={form.company_address}
                    onChange={(e) => update('company_address', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city"
                    value={form.company_city}
                    onChange={(e) => update('company_city', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state"
                      value={form.company_state}
                      onChange={(e) => update('company_state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">Zip</Label>
                    <Input id="zip"
                      value={form.company_zip}
                      onChange={(e) => update('company_zip', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input id="contact-person"
                    value={form.company_contact_name}
                    onChange={(e) => update('company_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input id="telephone"
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
                  <Label htmlFor="property-type-or-name">Property Type or Name</Label>
                  <Input id="property-type-or-name"
                    value={form.property_name}
                    onChange={(e) => update('property_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="address-2">Address</Label>
                  <Input id="address-2"
                    value={form.property_address}
                    onChange={(e) => update('property_address', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city-2">City</Label>
                  <Input id="city-2"
                    value={form.property_city}
                    onChange={(e) => update('property_city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="property-contact">Property Contact</Label>
                  <Input id="property-contact"
                    value={form.property_contact_name}
                    onChange={(e) => update('property_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="telephone-2">Telephone</Label>
                  <Input id="telephone-2"
                    value={form.property_phone}
                    onChange={(e) => update('property_phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="project-start-date">Project start date</Label>
                  <Input id="project-start-date"
                    type="date"
                    value={form.project_start_date}
                    onChange={(e) => update('project_start_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="project-end-date">Project end date</Label>
                  <Input id="project-end-date"
                    type="date"
                    value={form.project_end_date}
                    onChange={(e) => update('project_end_date', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="project-work-shifts">Project work shifts</Label>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2">
                      <Checkbox id="project-work-shifts"
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
              <p className="text-xs text-gray-500 mb-2">
                Give the quantity, the material, and where it is. This is the
                same wording that goes in the proposal. Example: &ldquo;Removal
                and disposal of approximately 225 sq ft of asbestos containing
                two layers of sheet vinyl in the lower level kitchen. 15&rsquo;
                x 15&rsquo;, on a plywood underlayment.&rdquo;
              </p>
              <Textarea
                rows={5}
                placeholder="Removal and disposal of approximately 225 sq ft of asbestos containing two layers of sheet vinyl in the lower level kitchen. 15' x 15', on a plywood underlayment."
                value={form.project_description}
                onChange={(e) => update('project_description', e.target.value)}
              />
              {descriptionHint && (
                <p className="text-xs text-gray-500 mt-1.5">{descriptionHint}</p>
              )}
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
                  <Label htmlFor="containment-or-barrier-system">Containment or barrier system</Label>
                  <Textarea id="containment-or-barrier-system"
                    rows={3}
                    placeholder="Describe negative air system, glovebag, full containment, mini-containment used for barrier."
                    value={form.containment}
                    onChange={(e) => update('containment', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ventilation-system-shutdown">Ventilation system shutdown</Label>
                  <Textarea id="ventilation-system-shutdown"
                    rows={3}
                    placeholder="Describe areas where ventilation system has been shut down."
                    value={form.ventilation}
                    onChange={(e) => update('ventilation', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="work-practices">Work practices</Label>
                  <Textarea id="work-practices"
                    rows={3}
                    placeholder="Describe wet methods, debris-lowering system, waste handling methods, etc."
                    value={form.work_practices}
                    onChange={(e) => update('work_practices', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="final-cleaning-and-clearance">Final cleaning and clearance</Label>
                  <Textarea id="final-cleaning-and-clearance"
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
