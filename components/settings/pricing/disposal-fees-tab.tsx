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
import type { DisposalFee } from '@/types/pricing'
import { disposalHazardTypeConfig } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'
import type { PricingTabProps } from './types'

export function DisposalFeesTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DisposalFee | null>(null)

  const save = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editing?.id,
        hazard_type: formData.get('hazard_type'),
        cost_per_cubic_yard: parseFloat(formData.get('cost_per_cubic_yard') as string),
        description: formData.get('description') || null,
      }

      const response = await fetch('/api/settings/pricing/disposal-fees', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save disposal fee')

      toast({ title: 'Success', description: 'Disposal fee saved' })
      setDialogOpen(false)
      setEditing(null)
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save disposal fee', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disposal fee?')) return

    try {
      const response = await fetch(`/api/settings/pricing/disposal-fees?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Deleted', description: 'Disposal fee deleted' })
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
            <CardTitle>Disposal Fees</CardTitle>
            <CardDescription>Hazardous waste disposal costs per cubic yard</CardDescription>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hazard Type</TableHead>
                <TableHead>Cost/Cu. Yd</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.disposal_fees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No disposal fees configured yet
                  </TableCell>
                </TableRow>
              ) : (
                data.disposal_fees.map(fee => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">
                      {disposalHazardTypeConfig[fee.hazard_type]?.label || fee.hazard_type}
                    </TableCell>
                    <TableCell>{formatCurrency(fee.cost_per_cubic_yard)}</TableCell>
                    <TableCell className="text-muted-foreground">{fee.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(fee); setDialogOpen(true); }} aria-label="Edit disposal fee">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(fee.id)} aria-label="Delete disposal fee">
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
              <DialogTitle>{editing ? 'Edit Disposal Fee' : 'Add Disposal Fee'}</DialogTitle>
              <DialogDescription>Configure disposal cost per cubic yard by hazard type</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Hazard Type *</Label>
                <Select name="hazard_type" defaultValue={editing?.hazard_type || 'asbestos_friable'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(disposalHazardTypeConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost per Cubic Yard *</Label>
                <Input name="cost_per_cubic_yard" type="number" step="0.01" min="0" defaultValue={editing?.cost_per_cubic_yard} required />
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
