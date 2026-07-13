'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Loader2, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

interface PortalInvoice {
  invoice_number: string
  status: string
  invoice_date: string
  due_date: string
  subtotal: number
  tax_amount: number | null
  discount_amount: number | null
  total: number
  amount_paid: number | null
  balance_due: number
  payment_terms: string | null
  notes: string | null
  customer: {
    name: string
    company_name: string | null
  }
  organization: {
    name: string | null
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    website: string | null
  }
  line_items: Array<{
    description: string
    quantity: number
    unit: string | null
    unit_price: number
    line_total: number
  }>
}

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function InvoicePortalPage() {
  const params = useParams()
  const token = params.token as string

  const [invoice, setInvoice] = useState<PortalInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/portal/invoice/${token}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load invoice')
      }
      const data = await response.json()
      setInvoice(data.invoice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-medium">Unable to load this invoice</p>
            <p className="text-sm text-muted-foreground">
              {error || 'This link may have expired. Please contact the company directly.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const customerName = invoice.customer.company_name || invoice.customer.name

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{invoice.organization.name || 'Invoice'}</h1>
            {invoice.organization.address && (
              <p className="text-sm text-muted-foreground">
                {[
                  invoice.organization.address,
                  [invoice.organization.city, invoice.organization.state, invoice.organization.zip]
                    .filter(Boolean)
                    .join(', '),
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <a href={`/api/portal/invoice/${token}/pdf`}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Invoice {invoice.invoice_number}</CardTitle>
                <p className="text-sm text-muted-foreground">Billed to {customerName}</p>
              </div>
            </div>
            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
              {invoice.status === 'paid' ? 'Paid' : invoice.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            </div>

            <Separator />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {(invoice.tax_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                )}
                {(invoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{formatCurrency(invoice.discount_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {(invoice.amount_paid || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span>-{formatCurrency(invoice.amount_paid || 0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(invoice.balance_due)}</span>
                </div>
              </div>
            </div>

            {invoice.payment_terms && (
              <div className="text-sm">
                <p className="font-medium mb-1">Payment Terms</p>
                <p className="text-muted-foreground">{invoice.payment_terms}</p>
              </div>
            )}

            {invoice.notes && (
              <div className="text-sm">
                <p className="font-medium mb-1">Notes</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Questions about this invoice? Contact {invoice.organization.name} at{' '}
          {invoice.organization.email || invoice.organization.phone}.
        </p>
      </div>
    </div>
  )
}
