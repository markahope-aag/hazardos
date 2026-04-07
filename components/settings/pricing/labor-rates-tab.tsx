'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { LaborRate } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'
import type { PricingTabProps } from './types'

export function LaborRatesTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LaborRate | null>(null)

  const save = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editing?.id,
        name: formData.get('name'),
        rate_per_hour: parseFloat(formData.get('rate_per_hour') as string),
        description: formData.get('description') || null,
        is_default: formData.get('is_default') === 'on',
      }

      const response = await fetch('/api/settings/pricing/labor-rates', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save labor rate')

      toast({ title: 'Success', description: 'Labor rate saved' })
      setDialogOpen(false)
      setEditing(null)
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save labor rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this labor rate?')) return

    try {
      const response = await fetch(`/api/settings/pricing/labor-rates?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Deleted', description: 'Labor rate deleted' })
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Labor Rates</CardTitle>
            <CardDescription>Hourly rates for different worker types</CardDescription>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate/Hour</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.labor_rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No labor rates configured yet
                  </TableCell>
                </TableRow>
              ) : (
                data.labor_rates.map(rate => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell>{formatCurrency(rate.rate_per_hour)}</TableCell>
                    <TableCell className="text-muted-foreground">{rate.description || '-'}</TableCell>
                    <TableCell>
                      {rate.is_default && <Badge variant="secondary">Default</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(rate); setDialogOpen(true); }} aria-label="Edit labor rate">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(rate.id)} aria-label="Delete labor rate">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form action={save}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Labor Rate' : 'Add Labor Rate'}</DialogTitle>
              <DialogDescription>Configure an hourly rate for a worker type</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editing?.name} placeholder="e.g., Technician" required />
              </div>
              <div className="space-y-2">
                <Label>Rate per Hour *</Label>
                <Input name="rate_per_hour" type="number" step="0.01" min="0" defaultValue={editing?.rate_per_hour} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editing?.description || ''} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox name="is_default" id="is_default" defaultChecked={editing?.is_default} />
                <Label htmlFor="is_default">Set as default rate</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
