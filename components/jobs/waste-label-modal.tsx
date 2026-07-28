'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { LABELS_PER_SHEET } from '@/lib/pdf/waste-label-template'
import { MAX_LABELS, type WasteLabelGenerateInput } from '@/lib/validations/waste-label'

interface PrefillResponse {
  contractor: {
    name: string
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  generator: string
  location: string
  label_count: number
}

const EMPTY_FORM: WasteLabelGenerateInput = {
  contractor_name: '',
  contractor_address: '',
  contractor_city: '',
  contractor_state: '',
  contractor_zip: '',
  generator: '',
  location: '',
  label_count: LABELS_PER_SHEET,
  include_warning: false,
}

interface WasteLabelModalProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WasteLabelModal({ jobId, open, onOpenChange }: WasteLabelModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<WasteLabelGenerateInput>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    fetch(`/api/jobs/${jobId}/waste-labels/prefill`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load job details')
        return (await res.json()) as PrefillResponse
      })
      .then((data) => {
        if (cancelled) return
        setForm({
          contractor_name: data.contractor.name ?? '',
          contractor_address: data.contractor.address ?? '',
          contractor_city: data.contractor.city ?? '',
          contractor_state: data.contractor.state ?? '',
          contractor_zip: data.contractor.zip ?? '',
          generator: data.generator ?? '',
          location: data.location ?? '',
          label_count: data.label_count ?? LABELS_PER_SHEET,
          include_warning: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        toast({
          title: 'Could not load job details',
          description: 'Fill the label in manually, or close and try again.',
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

  const update = <K extends keyof WasteLabelGenerateInput>(
    key: K,
    value: WasteLabelGenerateInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const sheets = Math.ceil(form.label_count / LABELS_PER_SHEET)
  const canSubmit =
    form.contractor_name.trim().length > 0 &&
    form.generator.trim().length > 0 &&
    form.location.trim().length > 0 &&
    form.label_count >= 1 &&
    form.label_count <= MAX_LABELS

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/waste-labels`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate labels')
      }
      toast({
        title: 'Waste labels generated',
        description: `${form.label_count} label${form.label_count === 1 ? '' : 's'} saved to this job’s documents.`,
      })
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobId] })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Could not generate labels',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const addressPreview = [
    form.contractor_city,
    [form.contractor_state, form.contractor_zip].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print waste container labels</DialogTitle>
          <DialogDescription>
            Pre-filled from this job. Prints on Avery 5162 sheets — {LABELS_PER_SHEET} labels per
            sheet, 4&quot; × 1⅓&quot;.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                Contractor
              </h3>
              <div className="space-y-2">
                <Label htmlFor="wl-contractor-name">Company name</Label>
                <Input
                  id="wl-contractor-name"
                  value={form.contractor_name}
                  onChange={(e) => update('contractor_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-contractor-address">Street address</Label>
                <Input
                  id="wl-contractor-address"
                  value={form.contractor_address}
                  onChange={(e) => update('contractor_address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wl-contractor-city">City</Label>
                  <Input
                    id="wl-contractor-city"
                    value={form.contractor_city}
                    onChange={(e) => update('contractor_city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-contractor-state">State</Label>
                  <Input
                    id="wl-contractor-state"
                    value={form.contractor_state}
                    onChange={(e) => update('contractor_state', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wl-contractor-zip">ZIP</Label>
                  <Input
                    id="wl-contractor-zip"
                    value={form.contractor_zip}
                    onChange={(e) => update('contractor_zip', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                Waste details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="wl-generator">Generator</Label>
                <Input
                  id="wl-generator"
                  value={form.generator}
                  onChange={(e) => update('generator', e.target.value)}
                  placeholder="Property owner or responsible party"
                />
                <p className="text-xs text-muted-foreground">
                  Whoever legally produced the waste — usually the property owner, not the billing
                  contact.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-location">Location</Label>
                <Input
                  id="wl-location"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="Address where the waste was generated"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                Sheet
              </h3>
              <div className="space-y-2">
                <Label htmlFor="wl-count">Number of labels</Label>
                <Input
                  id="wl-count"
                  type="number"
                  min={1}
                  max={MAX_LABELS}
                  value={form.label_count}
                  onChange={(e) => update('label_count', Number(e.target.value))}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  {sheets} sheet{sheets === 1 ? '' : 's'} of Avery 5162
                  {form.label_count % LABELS_PER_SHEET !== 0
                    ? ` — last sheet part-used, ${LABELS_PER_SHEET - (form.label_count % LABELS_PER_SHEET)} blank`
                    : ''}
                  .
                </p>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="wl-warning"
                  checked={form.include_warning}
                  onCheckedChange={(checked) => update('include_warning', checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="wl-warning" className="font-normal">
                    Add the OSHA asbestos warning to each label
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Leave off if your containers are already pre-printed with the DANGER warning.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-md border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Preview</p>
              <div className="font-mono text-xs leading-relaxed">
                <div>Contractor: {form.contractor_name || '—'}</div>
                {form.contractor_address ? <div>{form.contractor_address}</div> : null}
                {addressPreview ? <div>{addressPreview}</div> : null}
                <div>Generator: {form.generator || '—'}</div>
                <div>Location: {form.location || '—'}</div>
                {form.include_warning ? (
                  <div className="mt-1 border-t pt-1">
                    <div className="font-bold">DANGER — CONTAINS ASBESTOS FIBERS</div>
                    <div className="text-[10px]">
                      May cause cancer. Causes damage to lungs. Do not breathe dust. Avoid creating
                      dust.
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || submitting || !canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate labels'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
