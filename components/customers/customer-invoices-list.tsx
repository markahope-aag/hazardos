import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Eye, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface CustomerInvoicesListProps {
  customerId: string
}

interface InvoiceSummary {
  id: string
  invoice_number: string
  status: string
  invoice_date: string
  due_date: string
  total: number
  balance_due: number
  job_id: string | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-indigo-100 text-indigo-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  void: 'bg-gray-100 text-gray-500',
}

export default function CustomerInvoicesList({ customerId }: CustomerInvoicesListProps) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            status,
            invoice_date,
            due_date,
            total,
            balance_due,
            job_id
          `)
          .eq('customer_id', customerId)
          .order('invoice_date', { ascending: false })

        if (error) throw error
        setInvoices(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvoices()
  }, [customerId])

  const totalOutstanding = invoices
    .filter(inv => !['paid', 'void'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.balance_due), 0)

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoices
          {!isLoading && (
            <span className="text-sm font-normal text-gray-500">
              ({invoices.length})
            </span>
          )}
        </CardTitle>
        <Button
          size="sm"
          onClick={() => router.push(`/invoices/new?customer_id=${customerId}`)}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="text-red-600 mb-2">Error loading invoices</div>
            <div className="text-sm text-gray-500">{error}</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-gray-500 mb-4">
              Create the first invoice for this customer
            </p>
            <Button onClick={() => router.push(`/invoices/new?customer_id=${customerId}`)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 mb-2">
              <div className="text-sm">
                <span className="text-gray-500">Outstanding:</span>{' '}
                <span className="font-semibold text-amber-600">
                  {formatCurrency(totalOutstanding)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Paid:</span>{' '}
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
            </div>

            {/* Invoice List */}
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {invoice.invoice_number}
                      </h4>
                      <Badge className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
                        {invoice.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
                      <span className="font-medium">{formatCurrency(Number(invoice.total))}</span>
                      {invoice.balance_due > 0 && invoice.status !== 'paid' && (
                        <span className="text-amber-600">
                          {formatCurrency(Number(invoice.balance_due))} due
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Issued {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
