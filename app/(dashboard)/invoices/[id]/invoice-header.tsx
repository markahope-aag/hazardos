'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  MoreHorizontal,
  Send,
  DollarSign,
  Ban,
  Loader2,
  Download,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/types/invoices'
import { invoiceStatusConfig } from '@/types/invoices'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

interface InvoiceHeaderProps {
  invoice: Invoice
}

export function InvoiceHeader({ invoice }: InvoiceHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showVoidDialog, setShowVoidDialog] = useState(false)

  const isOverdue =
    invoice.status !== 'paid' &&
    invoice.status !== 'void' &&
    invoice.balance_due > 0 &&
    new Date(invoice.due_date) < new Date()

  const displayStatus = isOverdue ? 'overdue' : invoice.status

  const sendInvoice = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      })

      if (!response.ok) throw new Error('Failed to send')

      toast({ title: 'Invoice sent', description: 'Invoice has been sent to the customer' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to send invoice', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const voidInvoice = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/void`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to void')

      toast({ title: 'Invoice voided', description: 'Invoice has been voided' })
      setShowVoidDialog(false)
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to void invoice', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Back to invoices">
              <Link href="/invoices">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
            <Badge
              className={cn(
                invoiceStatusConfig[displayStatus]?.bgColor,
                invoiceStatusConfig[displayStatus]?.color
              )}
            >
              {invoiceStatusConfig[displayStatus]?.label || invoice.status}
            </Badge>
          </div>
          <div className="ml-10 space-y-1">
            <p className="text-muted-foreground">
              {invoice.customer?.company_name || invoice.customer?.name}
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Date: {format(parseISO(invoice.invoice_date), 'MMM d, yyyy')}</span>
              <span>Due: {format(parseISO(invoice.due_date), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Balance Due</div>
            <div className={cn('text-2xl font-bold', isOverdue && 'text-red-600')}>
              {formatCurrency(invoice.balance_due)}
            </div>
          </div>

          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <Button onClick={sendInvoice} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Invoice
              </Button>
            )}
            {invoice.balance_due > 0 && invoice.status !== 'void' && invoice.status !== 'draft' && (
              <Button asChild>
                <Link href={`/invoices/${invoice.id}/record-payment`}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More invoice actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/invoices/${invoice.id}/edit`}>Edit Invoice</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                {invoice.job && (
                  <DropdownMenuItem asChild>
                    <Link href={`/jobs/${invoice.job.id}`}>View Job</Link>
                  </DropdownMenuItem>
                )}
                {invoice.customer && (
                  <DropdownMenuItem asChild>
                    <Link href={`/customers/${invoice.customer.id}`}>View Customer</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {invoice.status !== 'void' && invoice.status !== 'paid' && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowVoidDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void Invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={voidInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
