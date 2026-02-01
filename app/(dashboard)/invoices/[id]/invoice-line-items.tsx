'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Invoice, InvoiceLineItem } from '@/types/invoices'

interface InvoiceLineItemsProps {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
}

export function InvoiceLineItems({ invoice, lineItems }: InvoiceLineItemsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<InvoiceLineItem | null>(null)

  const [form, setForm] = useState({
    description: '',
    quantity: '1',
    unit: '',
    unit_price: '',
  })

  const canEdit = invoice.status === 'draft'

  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ description: '', quantity: '1', unit: '', unit_price: '' })
    setShowDialog(true)
  }

  const openEditDialog = (item: InvoiceLineItem) => {
    setEditingItem(item)
    setForm({
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit || '',
      unit_price: item.unit_price.toString(),
    })
    setShowDialog(true)
  }

  const saveLineItem = async () => {
    if (!form.description || !form.unit_price) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      if (editingItem) {
        // Update
        const response = await fetch(`/api/invoices/${invoice.id}/line-items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_item_id: editingItem.id,
            description: form.description,
            quantity: parseFloat(form.quantity) || 1,
            unit: form.unit || null,
            unit_price: parseFloat(form.unit_price),
          }),
        })

        if (!response.ok) throw new Error('Failed to update')
        toast({ title: 'Success', description: 'Line item updated' })
      } else {
        // Create
        const response = await fetch(`/api/invoices/${invoice.id}/line-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: form.description,
            quantity: parseFloat(form.quantity) || 1,
            unit: form.unit || null,
            unit_price: parseFloat(form.unit_price),
          }),
        })

        if (!response.ok) throw new Error('Failed to add')
        toast({ title: 'Success', description: 'Line item added' })
      }

      setShowDialog(false)
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to save line item', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const deleteLineItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this line item?')) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/line-items?line_item_id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({ title: 'Deleted', description: 'Line item removed' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete line item', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {canEdit && (
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {canEdit && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No line items
                  </TableCell>
                </TableRow>
              ) : (
                lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.line_total)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLineItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            {lineItems.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={canEdit ? 4 : 4} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(invoice.subtotal)}
                  </TableCell>
                  {canEdit && <TableCell></TableCell>}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update this line item' : 'Add a new line item to the invoice'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Service or item description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_price}
                  onChange={(e) => setForm(prev => ({ ...prev, unit_price: e.target.value }))}
                />
              </div>
            </div>
            {form.quantity && form.unit_price && (
              <div className="text-right text-sm text-muted-foreground">
                Line Total: {formatCurrency(parseFloat(form.quantity) * parseFloat(form.unit_price))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveLineItem} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
