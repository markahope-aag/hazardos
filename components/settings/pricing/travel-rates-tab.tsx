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
import type { TravelRate } from '@/types/pricing'
import { formatCurrency } from '@/lib/utils'
import type { PricingTabProps } from './types'

export function TravelRatesTab({ data, onDataChange }: PricingTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TravelRate | null>(null)

  const save = async (formData: FormData) => {
    setSaving(true)
    try {
      const body = {
        id: editing?.id,
        min_miles: parseInt(formData.get('min_miles') as string),
        max_miles: formData.get('max_miles') ? parseInt(formData.get('max_miles') as string) : null,
        flat_fee: formData.get('flat_fee') ? parseFloat(formData.get('flat_fee') as string) : null,
        per_mile_rate: formData.get('per_mile_rate') ? parseFloat(formData.get('per_mile_rate') as string) : null,
      }

      const response = await fetch('/api/settings/pricing/travel-rates', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save travel rate')

      toast({ title: 'Success', description: 'Travel rate saved' })
      setDialogOpen(false)
      setEditing(null)
      onDataChange()
    } catch {
      toast({ title: 'Error', description: 'Failed to save travel rate', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this travel rate?')) return

    try {
      const response = await fetch(`/api/settings/pricing/travel-rates?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast({ title: 'Deleted', description: 'Travel rate deleted' })
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
            <CardTitle>Travel Rates</CardTitle>
            <CardDescription>Distance-based travel fees</CardDescription>
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
                <TableHead>Distance Range</TableHead>
                <TableHead>Flat Fee</TableHead>
                <TableHead>Per Mile Rate</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.travel_rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No travel rates configured yet
                  </TableCell>
                </TableRow>
              ) : (
                data.travel_rates.map(rate => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {rate.min_miles} - {rate.max_miles ? `${rate.max_miles} miles` : 'unlimited'}
                    </TableCell>
                    <TableCell>{rate.flat_fee ? formatCurrency(rate.flat_fee) : '-'}</TableCell>
                    <TableCell>{rate.per_mile_rate ? `${formatCurrency(rate.per_mile_rate)}/mile` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(rate); setDialogOpen(true); }} aria-label="Edit travel rate">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(rate.id)} aria-label="Delete travel rate">
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
              <DialogTitle>{editing ? 'Edit Travel Rate' : 'Add Travel Rate'}</DialogTitle>
              <DialogDescription>Configure travel fees based on distance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Miles *</Label>
                  <Input name="min_miles" type="number" min="0" defaultValue={editing?.min_miles || 0} required />
                </div>
                <div className="space-y-2">
                  <Label>Max Miles</Label>
                  <Input name="max_miles" type="number" min="0" defaultValue={editing?.max_miles || ''} placeholder="Leave empty for unlimited" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Flat Fee</Label>
                  <Input name="flat_fee" type="number" step="0.01" min="0" defaultValue={editing?.flat_fee || ''} placeholder="Fixed fee" />
                </div>
                <div className="space-y-2">
                  <Label>Per Mile Rate</Label>
                  <Input name="per_mile_rate" type="number" step="0.01" min="0" defaultValue={editing?.per_mile_rate || ''} placeholder="Rate per mile" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Provide either a flat fee, per mile rate, or both</p>
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
