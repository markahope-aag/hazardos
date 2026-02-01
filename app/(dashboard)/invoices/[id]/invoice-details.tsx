'use client'

import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { User, MapPin, FileText, Calendar } from 'lucide-react'
import type { Invoice } from '@/types/invoices'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface InvoiceDetailsProps {
  invoice: Invoice
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({(invoice.tax_rate * 100).toFixed(2)}%)
              </span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          )}
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-red-600">-{formatCurrency(invoice.discount_amount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span>-{formatCurrency(invoice.amount_paid)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Balance Due</span>
            <span>{formatCurrency(invoice.balance_due)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Customer Card */}
      {invoice.customer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">
                {invoice.customer.company_name || invoice.customer.name}
              </p>
              {invoice.customer.email && (
                <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
              )}
              {invoice.customer.phone && (
                <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
              )}
              {invoice.customer.address_line1 && (
                <p className="text-sm text-muted-foreground">
                  {invoice.customer.address_line1}
                  {invoice.customer.city && `, ${invoice.customer.city}`}
                  {invoice.customer.state && `, ${invoice.customer.state}`}
                  {invoice.customer.zip && ` ${invoice.customer.zip}`}
                </p>
              )}
              <Link
                href={`/customers/${invoice.customer.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Customer
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Card */}
      {invoice.job && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Related Job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{invoice.job.job_number}</p>
              <p className="text-sm text-muted-foreground">
                {invoice.job.job_address}
                {invoice.job.job_city && `, ${invoice.job.job_city}`}
                {invoice.job.job_state && `, ${invoice.job.job_state}`}
              </p>
              <Link
                href={`/jobs/${invoice.job.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Job
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dates Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Date</span>
            <span>{format(parseISO(invoice.invoice_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Due Date</span>
            <span>{format(parseISO(invoice.due_date), 'MMM d, yyyy')}</span>
          </div>
          {invoice.sent_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sent</span>
              <span>{format(parseISO(invoice.sent_at), 'MMM d, yyyy')}</span>
            </div>
          )}
          {invoice.viewed_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Viewed</span>
              <span>{format(parseISO(invoice.viewed_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
