'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

const ITEM_TYPES = [
  { value: 'labor', label: 'Labor' },
  { value: 'material', label: 'Material' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'disposal', label: 'Disposal' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
] as const
type ItemType = (typeof ITEM_TYPES)[number]['value']

interface LineItem {
  id: string
  item_type: ItemType
  category: string | null
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  total_price: number
  sort_order: number
  notes: string | null
}

interface NewItemDraft {
  item_type: ItemType
  description: string
  quantity: string
  unit: string
  unit_price: string
  category: string
}

const EMPTY_DRAFT: NewItemDraft = {
  item_type: 'labor',
  description: '',
  quantity: '1',
  unit: 'each',
  unit_price: '0',
  category: '',
}

export default function LineItemsPage() {
  const params = useParams()
  const { toast } = useToast()
  const estimateId = params.id as string

  const [items, setItems] = useState<LineItem[]>([])
  const [estimateNumber, setEstimateNumber] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submittingAdd, setSubmittingAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NewItemDraft>(EMPTY_DRAFT)

  const load = useCallback(async () => {
    try {
      const [estRes, itemsRes] = await Promise.all([
        fetch(`/api/estimates/${estimateId}`),
        fetch(`/api/estimates/${estimateId}/line-items`),
      ])
      if (!estRes.ok) throw new Error('Failed to load estimate')
      if (!itemsRes.ok) throw new Error('Failed to load line items')
      const estData = await estRes.json()
      const itemsData = await itemsRes.json()
      setEstimateNumber(estData.estimate?.estimate_number || '')
      const raw = Array.isArray(itemsData) ? itemsData : itemsData.line_items || itemsData.items || []
      setItems(raw)
    } catch (e) {
      toast({
        title: 'Failed to load',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [estimateId, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.description.trim()) return
    setSubmittingAdd(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: draft.item_type,
          category: draft.category.trim() || undefined,
          description: draft.description.trim(),
          quantity: Number(draft.quantity) || 1,
          unit: draft.unit.trim() || 'each',
          unit_price: Number(draft.unit_price) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to add line item')
      }
      setDraft(EMPTY_DRAFT)
      await load()
      toast({ title: 'Line item added' })
    } catch (e) {
      toast({
        title: 'Add failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmittingAdd(false)
    }
  }

  const handleRemove = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/estimates/${estimateId}/line-items/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to remove line item')
      }
      await load()
      toast({ title: 'Line item removed' })
    } catch (e) {
      toast({
        title: 'Remove failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpdate = async (
    id: string,
    patch: Partial<
      Pick<
        LineItem,
        'item_type' | 'description' | 'quantity' | 'unit' | 'unit_price' | 'category'
      >
    >,
  ) => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/line-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to update line item')
      }
      await load()
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href={`/estimates/${estimateId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Estimate
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Line items — {estimateNumber || 'Estimate'}</h1>
          <p className="text-muted-foreground text-sm">
            Add, edit, or remove line items. Totals recalculate automatically.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Subtotal</div>
          <div className="text-2xl font-bold">{formatCurrency(subtotal)}</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add line item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-1">
              <Label>Type</Label>
              <Select
                value={draft.item_type}
                onValueChange={(v) => setDraft({ ...draft, item_type: v as ItemType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="e.g. Abatement crew on-site"
                required
                maxLength={500}
              />
            </div>
            <div className="md:col-span-1">
              <Label>Qty</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <Label>Unit price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.unit_price}
                onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <Label>Category (optional)</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="e.g. friable asbestos removal"
                maxLength={100}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Unit</Label>
              <Input
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder="each / hr / sqft / day"
                maxLength={20}
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" disabled={submittingAdd} className="w-full">
                {submittingAdd ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current line items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No line items yet. Add your first one above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[90px] text-right">Qty</TableHead>
                  <TableHead className="w-[100px]">Unit</TableHead>
                  <TableHead className="w-[120px] text-right">Unit price</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(patch) => handleUpdate(item.id, patch)}
                    onRemove={() => handleRemove(item.id)}
                    deleting={deletingId === item.id}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LineItemRow({
  item,
  onUpdate,
  onRemove,
  deleting,
}: {
  item: LineItem
  onUpdate: (
    patch: Partial<
      Pick<LineItem, 'item_type' | 'description' | 'quantity' | 'unit' | 'unit_price' | 'category'>
    >,
  ) => void
  onRemove: () => void
  deleting: boolean
}) {
  // Local draft — commit on blur so each keystroke isn't a PATCH. Keeps
  // the editor responsive and avoids thrashing the recalculated totals.
  const [local, setLocal] = useState({
    description: item.description,
    quantity: String(item.quantity),
    unit: item.unit || '',
    unit_price: String(item.unit_price),
    notes: item.notes || '',
  })

  useEffect(() => {
    setLocal({
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit || '',
      unit_price: String(item.unit_price),
      notes: item.notes || '',
    })
  }, [item])

  const commit = (
    field: 'description' | 'quantity' | 'unit' | 'unit_price',
    raw: string,
  ) => {
    if (field === 'quantity' || field === 'unit_price') {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) return
      onUpdate({ [field]: n } as never)
    } else {
      onUpdate({ [field]: raw } as never)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <Select
          value={item.item_type}
          onValueChange={(v) => onUpdate({ item_type: v as ItemType })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEM_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Textarea
          value={local.description}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          onBlur={() => {
            if (local.description.trim() !== item.description) {
              commit('description', local.description.trim())
            }
          }}
          rows={1}
          className="min-h-[36px] resize-none"
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={local.quantity}
          onChange={(e) => setLocal({ ...local, quantity: e.target.value })}
          onBlur={() => {
            if (Number(local.quantity) !== item.quantity) {
              commit('quantity', local.quantity)
            }
          }}
          className="h-9 text-right"
        />
      </TableCell>
      <TableCell>
        <Input
          value={local.unit}
          onChange={(e) => setLocal({ ...local, unit: e.target.value })}
          onBlur={() => {
            if (local.unit !== (item.unit || '')) commit('unit', local.unit)
          }}
          className="h-9"
          maxLength={20}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={local.unit_price}
          onChange={(e) => setLocal({ ...local, unit_price: e.target.value })}
          onBlur={() => {
            if (Number(local.unit_price) !== item.unit_price) {
              commit('unit_price', local.unit_price)
            }
          }}
          className="h-9 text-right"
        />
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(item.total_price || 0)}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={deleting}
          className="text-destructive hover:text-destructive"
          aria-label="Remove line item"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </TableCell>
    </TableRow>
  )
}

