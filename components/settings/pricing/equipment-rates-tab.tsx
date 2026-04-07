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
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { EquipmentRate } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'
import type { PricingTabProps } from './types'

export function EquipmentRatesTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EquipmentRate | null>(null)

  const save = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editing?.id,
        name: formData.get('name'),
        rate_per_day: parseFloat(formData.get('rate_per_day') as string),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/equipment-rates', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save equipment rate')

      toast({ title: 'Success', description: 'Equipment rate saved' })
      setDialogOpen(false)
      setEditing(null)
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save equipment rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment rate?')) return

    try {
      const response = await fetch(`/api/settings/pricing/equipment-rates?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Deleted', description: 'Equipment rate deleted' })
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
            <CardTitle>Equipment Rates</CardTitle>
            <CardDescription>Daily rental rates for equipment</CardDescription>
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
                <TableHead>Rate/Day</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.equipment_rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No equipment rates configured yet
                  </TableCell>
                </TableRow>
              ) : (
                data.equipment_rates.map(rate => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell>{formatCurrency(rate.rate_per_day)}</TableCell>
                    <TableCell className="text-muted-foreground">{rate.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(rate); setDialogOpen(true); }} aria-label="Edit equipment rate">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(rate.id)} aria-label="Delete equipment rate">
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
              <DialogTitle>{editing ? 'Edit Equipment Rate' : 'Add Equipment Rate'}</DialogTitle>
              <DialogDescription>Configure a daily rental rate for equipment</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editing?.name} placeholder="e.g., HEPA Vacuum" required />
              </div>
              <div className="space-y-2">
                <Label>Rate per Day *</Label>
                <Input name="rate_per_day" type="number" step="0.01" min="0" defaultValue={editing?.rate_per_day} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" defaultValue={editing?.description || ''} placeholder="Optional description" />
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
