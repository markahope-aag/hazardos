'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
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
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Invoice, Payment, PaymentMethod } from '@/types/invoices'
import { paymentMethodConfig } from '@/types/invoices'

interface InvoicePaymentsProps {
  invoice: Invoice
  payments: Payment[]
}

export function InvoicePayments({ invoice, payments }: InvoicePaymentsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const [form, setForm] = useState({
    amount: invoice.balance_due.toString(),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check' as PaymentMethod,
    reference_number: '',
    notes: '',
  })

  const canRecordPayment = invoice.balance_due > 0 && invoice.status !== 'void'

  const openDialog = () => {
    setForm({
      amount: invoice.balance_due.toString(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'check',
      reference_number: '',
      notes: '',
    })
    setShowDialog(true)
  }

  const recordPayment = async () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }

    if (amount > invoice.balance_due) {
      toast({
        title: 'Error',
        description: `Amount exceeds balance due of ${formatCurrency(invoice.balance_due)}`,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          reference_number: form.reference_number || null,
          notes: form.notes || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to record payment')

      toast({ title: 'Success', description: 'Payment recorded' })
      setShowDialog(false)
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments?payment_id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({ title: 'Deleted', description: 'Payment removed' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to delete payment', variant: 'destructive' })
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          {canRecordPayment && (
            <Button size="sm" onClick={openDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No payments recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {payment.payment_method
                        ? paymentMethodConfig[payment.payment_method]?.label || payment.payment_method
                        : '-'}
                    </TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePayment(payment.id)}
                        aria-label="Delete payment"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this invoice. Balance due: {formatCurrency(invoice.balance_due)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.balance_due}
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(value) => setForm(prev => ({ ...prev, payment_method: value as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={form.reference_number}
                  onChange={(e) => setForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Check #, Transaction ID"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this payment"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={recordPayment} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
