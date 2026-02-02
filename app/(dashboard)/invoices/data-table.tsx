'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, Send, DollarSign, Ban } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/types/invoices'
import { invoiceStatusConfig } from '@/types/invoices'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

// Memoized helper for days overdue calculation
const getDaysOverdue = (dueDate: string) => {
  const today = new Date()
  const due = parseISO(dueDate)
  return differenceInDays(today, due)
}

// Memoized table row component
interface InvoiceRowProps {
  invoice: Invoice
  onRowClick: (id: string) => void
  onSend: (id: string, e: React.MouseEvent) => void
  onVoid: (id: string, e: React.MouseEvent) => void
}

const InvoiceRow = memo(function InvoiceRow({ invoice, onRowClick, onSend, onVoid }: InvoiceRowProps) {
  const isOverdue = invoice.status !== 'paid' &&
    invoice.status !== 'void' &&
    invoice.balance_due > 0 &&
    new Date(invoice.due_date) < new Date()
  const daysOverdue = isOverdue ? getDaysOverdue(invoice.due_date) : 0

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onRowClick(invoice.id)}
    >
      <TableCell className="font-medium">
        {invoice.invoice_number}
      </TableCell>
      <TableCell>
        {invoice.customer?.company_name || invoice.customer?.name || '-'}
      </TableCell>
      <TableCell>
        {invoice.job?.job_number || '-'}
      </TableCell>
      <TableCell>
        {format(parseISO(invoice.invoice_date), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        <div className={cn(isOverdue && 'text-red-600 font-medium')}>
          {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
          {isOverdue && (
            <div className="text-xs">
              {daysOverdue} days overdue
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(invoice.total)}
      </TableCell>
      <TableCell className="text-right">
        {invoice.balance_due > 0 ? (
          <span className={cn(isOverdue && 'text-red-600 font-medium')}>
            {formatCurrency(invoice.balance_due)}
          </span>
        ) : (
          <span className="text-green-600">Paid</span>
        )}
      </TableCell>
      <TableCell>
        <Badge
          className={cn(
            isOverdue
              ? invoiceStatusConfig.overdue.bgColor + ' ' + invoiceStatusConfig.overdue.color
              : invoiceStatusConfig[invoice.status]?.bgColor + ' ' + invoiceStatusConfig[invoice.status]?.color
          )}
        >
          {isOverdue ? 'Overdue' : invoiceStatusConfig[invoice.status]?.label || invoice.status}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" aria-label="Invoice actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}`}>View Details</Link>
            </DropdownMenuItem>
            {invoice.status === 'draft' && (
              <DropdownMenuItem onClick={(e) => onSend(invoice.id, e)}>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </DropdownMenuItem>
            )}
            {invoice.balance_due > 0 && invoice.status !== 'void' && (
              <DropdownMenuItem asChild>
                <Link href={`/invoices/${invoice.id}?record_payment=true`}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {invoice.status !== 'void' && invoice.status !== 'paid' && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => onVoid(invoice.id, e)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Void Invoice
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
})

interface InvoicesDataTableProps {
  data: Invoice[]
}

export function InvoicesDataTable({ data }: InvoicesDataTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Memoize filtered data
  const filteredData = useMemo(() => {
    return data.filter(invoice => {
      const matchesSearch = search === '' ||
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        invoice.customer?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        invoice.customer?.name?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  const handleRowClick = useCallback((id: string) => {
    router.push(`/invoices/${id}`)
  }, [router])

  const sendInvoice = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email' }),
      })

      if (!response.ok) throw new Error('Failed to send')

      toast({ title: 'Invoice sent', description: 'Invoice has been marked as sent' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to send invoice', variant: 'destructive' })
    }
  }, [router, toast])

  const voidInvoice = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to void this invoice?')) return

    try {
      const response = await fetch(`/api/invoices/${id}/void`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to void')

      toast({ title: 'Invoice voided', description: 'Invoice has been voided' })
      router.refresh()
    } catch {
      toast({ title: 'Error', description: 'Failed to void invoice', variant: 'destructive' })
    }
  }, [router, toast])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search invoices by number, customer, or amount"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onRowClick={handleRowClick}
                  onSend={sendInvoice}
                  onVoid={voidInvoice}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} invoices
      </div>
    </div>
  )
}
