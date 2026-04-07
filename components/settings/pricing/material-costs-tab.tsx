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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { MaterialCost } from '@/types/pricing'
import { commonUnits } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'
import type { PricingTabProps } from './types'

export function MaterialCostsTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MaterialCost | null>(null)

  const save = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editing?.id,
        name: formData.get('name'),
        cost_per_unit: parseFloat(formData.get('cost_per_unit') as string),
        unit: formData.get('unit'),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/material-costs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save material cost')

      toast({ title: 'Success', description: 'Material cost saved' })
      setDialogOpen(false)
      setEditing(null)
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save material cost', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material cost?')) return

    try {
      const response = await fetch(`/api/settings/pricing/material-costs?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Deleted', description: 'Material cost deleted' })
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
            <CardTitle>Material Costs</CardTitle>
            <CardDescription>Unit costs for materials and supplies</CardDescription>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.material_costs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No material costs configured yet
                  </TableCell>
                </TableRow>
              ) : (
                data.material_costs.map(material => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>{formatCurrency(material.cost_per_unit)}</TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-muted-foreground">{material.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(material); setDialogOpen(true); }} aria-label="Edit material cost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(material.id)} aria-label="Delete material cost">
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
              <DialogTitle>{editing ? 'Edit Material Cost' : 'Add Material Cost'}</DialogTitle>
              <DialogDescription>Configure a unit cost for materials</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editing?.name} placeholder="e.g., Poly Sheeting" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost per Unit *</Label>
                  <Input name="cost_per_unit" type="number" step="0.01" min="0" defaultValue={editing?.cost_per_unit} required />
                </div>
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Select name="unit" defaultValue={editing?.unit || 'each'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {commonUnits.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
