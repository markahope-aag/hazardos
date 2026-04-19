'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface EstimateForm {
  project_name: string
  scope_of_work: string
  estimated_duration_days: string
  estimated_start_date: string
  estimated_end_date: string
  markup_percent: string
  discount_percent: string
  tax_percent: string
  notes: string
  internal_notes: string
}

const EMPTY_FORM: EstimateForm = {
  project_name: '',
  scope_of_work: '',
  estimated_duration_days: '',
  estimated_start_date: '',
  estimated_end_date: '',
  markup_percent: '',
  discount_percent: '',
  tax_percent: '',
  notes: '',
  internal_notes: '',
}

export default function EditEstimatePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const estimateId = params.id as string

  const [form, setForm] = useState<EstimateForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estimateNumber, setEstimateNumber] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/estimates/${estimateId}`)
        if (!res.ok) throw new Error('Failed to load estimate')
        const data = await res.json()
        const e = data.estimate
        setEstimateNumber(e.estimate_number || '')
        setForm({
          project_name: e.project_name || '',
          scope_of_work: e.scope_of_work || '',
          estimated_duration_days: e.estimated_duration_days != null ? String(e.estimated_duration_days) : '',
          estimated_start_date: e.estimated_start_date || '',
          estimated_end_date: e.estimated_end_date || '',
          markup_percent: e.markup_percent != null ? String(e.markup_percent) : '',
          discount_percent: e.discount_percent != null ? String(e.discount_percent) : '',
          tax_percent: e.tax_percent != null ? String(e.tax_percent) : '',
          notes: e.notes || '',
          internal_notes: e.internal_notes || '',
        })
      } catch (e) {
        toast({
          title: 'Failed to load',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
        router.push(`/estimates/${estimateId}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [estimateId, router, toast])

  const update = <K extends keyof EstimateForm>(key: K, value: EstimateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Only include fields the user actually touched / has a value for.
    // The PATCH endpoint treats undefined as "no change" and zod's .optional()
    // accepts missing keys. Empty strings on the numeric fields would fail
    // validation, so we skip them entirely.
    const patch: Record<string, unknown> = {}
    if (form.project_name.trim()) patch.project_name = form.project_name.trim()
    if (form.scope_of_work.trim()) patch.scope_of_work = form.scope_of_work.trim()
    if (form.estimated_duration_days.trim()) {
      const n = Number(form.estimated_duration_days)
      if (Number.isFinite(n) && n > 0) patch.estimated_duration_days = n
    }
    if (form.estimated_start_date) patch.estimated_start_date = form.estimated_start_date
    if (form.estimated_end_date) patch.estimated_end_date = form.estimated_end_date
    if (form.markup_percent.trim()) {
      const n = Number(form.markup_percent)
      if (Number.isFinite(n)) patch.markup_percent = n
    }
    if (form.discount_percent.trim()) {
      const n = Number(form.discount_percent)
      if (Number.isFinite(n)) patch.discount_percent = n
    }
    if (form.tax_percent.trim()) {
      const n = Number(form.tax_percent)
      if (Number.isFinite(n)) patch.tax_percent = n
    }
    if (form.notes.trim()) patch.notes = form.notes.trim()
    if (form.internal_notes.trim()) patch.internal_notes = form.internal_notes.trim()

    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Save failed')
      }
      toast({ title: 'Estimate updated' })
      router.push(`/estimates/${estimateId}`)
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href={`/estimates/${estimateId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Estimate
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit {estimateNumber || 'Estimate'}</h1>
        <p className="text-muted-foreground text-sm">
          Header details — line items are edited separately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project_name">Project name</Label>
              <Input
                id="project_name"
                value={form.project_name}
                onChange={(e) => update('project_name', e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="scope_of_work">Scope of work</Label>
              <Textarea
                id="scope_of_work"
                value={form.scope_of_work}
                onChange={(e) => update('scope_of_work', e.target.value)}
                rows={5}
                maxLength={5000}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="estimated_start_date">Start date</Label>
              <Input
                id="estimated_start_date"
                type="date"
                value={form.estimated_start_date}
                onChange={(e) => update('estimated_start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estimated_end_date">End date</Label>
              <Input
                id="estimated_end_date"
                type="date"
                value={form.estimated_end_date}
                onChange={(e) => update('estimated_end_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estimated_duration_days">Duration (days)</Label>
              <Input
                id="estimated_duration_days"
                type="number"
                min="1"
                value={form.estimated_duration_days}
                onChange={(e) => update('estimated_duration_days', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="markup_percent">Markup %</Label>
              <Input
                id="markup_percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.markup_percent}
                onChange={(e) => update('markup_percent', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="discount_percent">Discount %</Label>
              <Input
                id="discount_percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.discount_percent}
                onChange={(e) => update('discount_percent', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax_percent">Tax %</Label>
              <Input
                id="tax_percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.tax_percent}
                onChange={(e) => update('tax_percent', e.target.value)}
              />
            </div>
            <p className="sm:col-span-3 text-xs text-muted-foreground">
              Totals will recalculate automatically after save.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Customer-facing notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Visible on the customer's proposal."
              />
            </div>
            <div>
              <Label htmlFor="internal_notes">Internal notes</Label>
              <Textarea
                id="internal_notes"
                value={form.internal_notes}
                onChange={(e) => update('internal_notes', e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="For staff only — never leaves HazardOS."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/estimates/${estimateId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
