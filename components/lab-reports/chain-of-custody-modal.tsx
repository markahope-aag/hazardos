'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import {
  MAX_COC_SAMPLES,
  type CocSampleInput,
  type LabCocGenerateInput,
} from '@/lib/validations/lab-coc'

const TURNAROUND_PRESETS = ['Same day', '24 hour', '48 hour', 'Standard (3-5 day)']

const EMPTY_SAMPLE: CocSampleInput = { sample_number: '', description: '', location: '' }

interface ChainOfCustodyModalProps {
  reportId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChainOfCustodyModal({ reportId, open, onOpenChange }: ChainOfCustodyModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<LabCocGenerateInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/lab-reports/${reportId}/coc/prefill`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load lab report')
        return res.json()
      })
      .then((d) => {
        if (cancelled) return
        setForm({
          report_number: d.report_number,
          form_title: d.form_title,
          contractor_name: d.contractor.name ?? '',
          contractor_address: d.contractor.address ?? '',
          contractor_city: d.contractor.city ?? '',
          contractor_state: d.contractor.state ?? '',
          contractor_zip: d.contractor.zip ?? '',
          contractor_phone: d.contractor.phone ?? '',
          contractor_email: d.contractor.email ?? '',
          lab_name: d.lab.name ?? '',
          lab_address: d.lab.address ?? '',
          lab_phone: d.lab.phone ?? '',
          submitted_to: d.submitted_to ?? '',
          site_address: d.site.address ?? '',
          site_city: d.site.city ?? '',
          site_state: d.site.state ?? '',
          site_zip: d.site.zip ?? '',
          collected_date: d.collected_date,
          turnaround: d.turnaround ?? 'Standard',
          relinquished_by: d.relinquished_by ?? '',
          samples: d.samples?.length ? d.samples : [{ ...EMPTY_SAMPLE, sample_number: '1' }],
        })
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: 'Could not load lab report',
            description: 'Close and try again.',
            variant: 'destructive',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, reportId, toast])

  const update = <K extends keyof LabCocGenerateInput>(key: K, value: LabCocGenerateInput[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateSample = (index: number, patch: Partial<CocSampleInput>) => {
    setForm((prev) =>
      prev
        ? { ...prev, samples: prev.samples.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
        : prev,
    )
  }

  const addSample = () => {
    setForm((prev) => {
      if (!prev) return prev
      // Continue the numbering rather than restarting — crews label
      // containers sequentially as they collect.
      const nextNumber = String(prev.samples.length + 1)
      return { ...prev, samples: [...prev.samples, { ...EMPTY_SAMPLE, sample_number: nextNumber }] }
    })
  }

  const removeSample = (index: number) => {
    setForm((prev) =>
      prev ? { ...prev, samples: prev.samples.filter((_, i) => i !== index) } : prev,
    )
  }

  const duplicateNumbers = (() => {
    if (!form) return new Set<string>()
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const s of form.samples) {
      const key = s.sample_number.trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) dupes.add(key)
      seen.add(key)
    }
    return dupes
  })()

  const canSubmit =
    !!form &&
    form.contractor_name.trim() &&
    form.lab_name.trim() &&
    form.site_address.trim() &&
    form.turnaround.trim() &&
    form.samples.length > 0 &&
    form.samples.every((s) => s.sample_number.trim() && s.description.trim()) &&
    duplicateNumbers.size === 0

  const handleSubmit = async () => {
    if (!form) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/lab-reports/${reportId}/coc`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate the form')
      }

      // The form is printed and signed by hand, so open it for printing
      // rather than filing it away.
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)

      toast({
        title: 'Chain of custody ready',
        description: `${form.samples.length} sample${form.samples.length === 1 ? '' : 's'} saved to this report.`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Could not generate the form',
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
          <DialogTitle>Chain of custody form</DialogTitle>
          <DialogDescription>
            Prints the sheet that travels with the samples. The sample numbers are saved to this
            report, so results come back against the same list.
          </DialogDescription>
        </DialogHeader>

        {loading || !form ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coc-lab">Lab</Label>
                <Input
                  id="coc-lab"
                  value={form.lab_name}
                  onChange={(e) => update('lab_name', e.target.value)}
                />
                <Input
                  aria-label="Lab address"
                  value={form.lab_address}
                  onChange={(e) => update('lab_address', e.target.value)}
                  placeholder="Lab address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coc-site">Site address</Label>
                <Input
                  id="coc-site"
                  value={form.site_address}
                  onChange={(e) => update('site_address', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    aria-label="Site city"
                    value={form.site_city}
                    onChange={(e) => update('site_city', e.target.value)}
                    placeholder="City"
                  />
                  <Input
                    aria-label="Site state"
                    value={form.site_state}
                    onChange={(e) => update('site_state', e.target.value)}
                    placeholder="State"
                  />
                  <Input
                    aria-label="Site ZIP"
                    value={form.site_zip}
                    onChange={(e) => update('site_zip', e.target.value)}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="coc-submitted-to">Submitted to</Label>
              <Textarea
                id="coc-submitted-to"
                rows={3}
                value={form.submitted_to}
                onChange={(e) => update('submitted_to', e.target.value)}
                placeholder={'Kelly Barton (project)\nFiona Stoner (PM), (608) 555-0100'}
              />
              <p className="text-xs text-muted-foreground">
                Who the results go to. One per line — often a client PM plus a project contact.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Samples</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSample}
                  disabled={form.samples.length >= MAX_COC_SAMPLES}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add sample
                </Button>
              </div>

              <div className="space-y-2">
                {form.samples.map((s, i) => {
                  const isDupe =
                    !!s.sample_number.trim() &&
                    duplicateNumbers.has(s.sample_number.trim().toLowerCase())
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <Input
                        aria-label={`Sample ${i + 1} number`}
                        className={`w-20 shrink-0 ${isDupe ? 'border-destructive' : ''}`}
                        value={s.sample_number}
                        onChange={(e) => updateSample(i, { sample_number: e.target.value })}
                        placeholder="#"
                      />
                      <div className="flex-1 space-y-1">
                        <Input
                          aria-label={`Sample ${i + 1} description`}
                          value={s.description}
                          onChange={(e) => updateSample(i, { description: e.target.value })}
                          placeholder="Insulation inside the walls of the sunroom"
                        />
                        <Input
                          aria-label={`Sample ${i + 1} location`}
                          value={s.location}
                          onChange={(e) => updateSample(i, { location: e.target.value })}
                          placeholder="Location (optional)"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove sample ${i + 1}`}
                        onClick={() => removeSample(i)}
                        disabled={form.samples.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {duplicateNumbers.size > 0 && (
                <p className="text-sm text-destructive">
                  Sample numbers must be unique — the lab logs results against them.
                </p>
              )}
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coc-turnaround">Turnaround</Label>
                <Input
                  id="coc-turnaround"
                  list="coc-turnaround-options"
                  value={form.turnaround}
                  onChange={(e) => update('turnaround', e.target.value)}
                />
                <datalist id="coc-turnaround-options">
                  {TURNAROUND_PRESETS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coc-date">Date collected</Label>
                <Input
                  id="coc-date"
                  type="date"
                  value={form.collected_date}
                  onChange={(e) => update('collected_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coc-relinquished">Relinquished by</Label>
                <Input
                  id="coc-relinquished"
                  value={form.relinquished_by}
                  onChange={(e) => update('relinquished_by', e.target.value)}
                />
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
              'Generate form'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
