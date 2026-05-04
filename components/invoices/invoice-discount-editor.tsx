'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

type DiscountMode = 'percent' | 'amount'

interface InvoiceDiscountEditorProps {
  invoiceId: string
  subtotal: number
  taxAmount: number
  currentDiscount: number
  // Locked once the invoice is paid or voided so the historical record
  // can't shift after the fact.
  locked?: boolean
}

export function InvoiceDiscountEditor({
  invoiceId,
  subtotal,
  taxAmount,
  currentDiscount,
  locked = false,
}: InvoiceDiscountEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<DiscountMode>('amount')
  const [value, setValue] = useState<string>('')

  const startEdit = () => {
    setMode('amount')
    setValue(currentDiscount > 0 ? String(currentDiscount) : '')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setValue('')
  }

  const computeAmount = (): number => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return 0
    if (mode === 'percent') {
      // Percent applies to subtotal + tax so a 10% goodwill credit on a
      // taxed invoice actually trims 10% of what the customer would owe.
      return Math.round((subtotal + taxAmount) * (n / 100) * 100) / 100
    }
    return Math.round(n * 100) / 100
  }

  const save = async () => {
    const amount = computeAmount()
    const cap = subtotal + taxAmount
    if (amount > cap) {
      toast({
        title: 'Discount exceeds invoice subtotal + tax',
        description: `Maximum: ${formatCurrency(cap)}`,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_amount: amount }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast({
        title: amount > 0 ? 'Discount applied' : 'Discount removed',
        description: amount > 0 ? formatCurrency(amount) : undefined,
      })
      setEditing(false)
      router.refresh()
    } catch {
      toast({
        title: 'Could not update discount',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    if (currentDiscount <= 0 && locked) return null
    return (
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Discount</span>
        <div className="flex items-center gap-2">
          {currentDiscount > 0 ? (
            <span className="text-red-600">-{formatCurrency(currentDiscount)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
          {!locked && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={startEdit}
              aria-label="Edit discount"
              title="Edit discount"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  const previewAmount = computeAmount()

  return (
    <div className="rounded-md border border-dashed border-gray-300 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Discount</span>
        <div className="inline-flex rounded-md border bg-background text-xs">
          <button
            type="button"
            onClick={() => setMode('percent')}
            className={`px-2 py-0.5 rounded-l-md ${
              mode === 'percent'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-pressed={mode === 'percent'}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMode('amount')}
            className={`px-2 py-0.5 rounded-r-md ${
              mode === 'amount'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-pressed={mode === 'amount'}
          >
            $
          </button>
        </div>
      </div>
      <Input
        type="number"
        min="0"
        max={mode === 'percent' ? '100' : undefined}
        step={mode === 'percent' ? '0.1' : '0.01'}
        placeholder={mode === 'percent' ? '0' : '0.00'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        disabled={saving}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {mode === 'percent' && value
            ? `Applied: ${formatCurrency(previewAmount)}`
            : 'Leave blank or 0 to remove'}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={cancel}
            disabled={saving}
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-7 w-7"
            onClick={save}
            disabled={saving}
            aria-label="Save discount"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
