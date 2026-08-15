'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Package, Plus, Loader2, Trash2 } from 'lucide-react'
import type { JobMaterialUsage } from '@/types/job-completion'

interface JobMaterialsProps {
  jobId: string
  materialUsage: JobMaterialUsage[]
}

const emptyForm = {
  material_name: '',
  quantity_estimated: '',
  quantity_used: '',
  unit: '',
  unit_cost: '',
  notes: '',
}

/**
 * What a crew actually used on a job, separate from what the estimate
 * priced. quantity_estimated is optional per row — leave it blank for a
 * material that was never itemized on the estimate to begin with (bought on
 * the fly) rather than forcing a number that doesn't exist.
 */
export function JobMaterials({ jobId, materialUsage }: JobMaterialsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const totalCost = materialUsage.reduce((sum, m) => sum + (m.total_cost || 0), 0)

  const handleAdd = async () => {
    const quantityUsed = Number(form.quantity_used)
    if (!form.material_name.trim()) {
      toast({ title: 'Error', description: 'Enter a material name.', variant: 'destructive' })
      return
    }
    if (!form.quantity_used || Number.isNaN(quantityUsed) || quantityUsed <= 0) {
      toast({ title: 'Error', description: 'Enter a quantity used.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_name: form.material_name.trim(),
          quantity_used: quantityUsed,
          quantity_estimated: form.quantity_estimated ? Number(form.quantity_estimated) : undefined,
          unit: form.unit.trim() || undefined,
          unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to record material')
      }
      toast({ title: 'Material recorded' })
      setForm(emptyForm)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record material',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (usageId: string) => {
    setDeletingId(usageId)
    try {
      const res = await fetch(`/api/jobs/${jobId}/material-usage/${usageId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to remove material')
      }
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove material',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Materials Used
        </CardTitle>
        <div className="flex items-center gap-3">
          {materialUsage.length > 0 && (
            <Badge variant="secondary">{formatCurrency(totalCost)} total</Badge>
          )}
          <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setForm(emptyForm) }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Material Used</DialogTitle>
                <DialogDescription>
                  What the crew actually used on site. Leave estimated quantity blank if this
                  wasn&apos;t itemized on the estimate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="mat-name">Material *</Label>
                  <Input
                    id="mat-name"
                    value={form.material_name}
                    onChange={(e) => setForm({ ...form, material_name: e.target.value })}
                    placeholder="e.g., Containment bags"
                    maxLength={255}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mat-qty-est">Estimated Qty</Label>
                    <Input
                      id="mat-qty-est"
                      type="number"
                      step="0.01"
                      value={form.quantity_estimated}
                      onChange={(e) => setForm({ ...form, quantity_estimated: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mat-qty-used">Quantity Used *</Label>
                    <Input
                      id="mat-qty-used"
                      type="number"
                      step="0.01"
                      value={form.quantity_used}
                      onChange={(e) => setForm({ ...form, quantity_used: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mat-unit">Unit</Label>
                    <Input
                      id="mat-unit"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="bags, sqft, gallons..."
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mat-unit-cost">Unit Cost</Label>
                    <Input
                      id="mat-unit-cost"
                      type="number"
                      step="0.01"
                      value={form.unit_cost}
                      onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat-notes">Notes</Label>
                  <Textarea
                    id="mat-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Record Material
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {materialUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No materials recorded yet. Use this to track what the crew actually used,
            separate from what the estimate priced.
          </p>
        ) : (
          <div className="space-y-3">
            {materialUsage.map((m) => (
              <div key={m.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{m.material_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.quantity_used} {m.unit || 'units'} used
                    {m.quantity_estimated !== null && ` (est. ${m.quantity_estimated})`}
                    {m.unit_cost !== null && ` @ ${formatCurrency(m.unit_cost)}`}
                  </p>
                  {m.variance_percent !== null && (
                    <Badge
                      variant="outline"
                      className={
                        Math.abs(m.variance_percent) > 10
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }
                    >
                      {m.variance_percent > 0 ? '+' : ''}{m.variance_percent.toFixed(1)}% vs. estimate
                    </Badge>
                  )}
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {m.total_cost !== null && (
                    <span className="font-medium whitespace-nowrap">{formatCurrency(m.total_cost)}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${m.material_name}`}
                    disabled={deletingId === m.id}
                    onClick={() => handleDelete(m.id)}
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
