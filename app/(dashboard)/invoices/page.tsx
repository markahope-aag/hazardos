import { createClient } from '@/lib/supabase/server'
import { InvoicesDataTable } from './data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Plus,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; customer_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, name, company_name, email),
      job:jobs(id, job_number)
    `)
    .order('invoice_date', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.customer_id) {
    query = query.eq('customer_id', params.customer_id)
  }

  const { data: invoicesData } = await query

  // Transform data
  const invoices = (invoicesData || []).map(inv => ({
    ...inv,
    customer: Array.isArray(inv.customer) ? inv.customer[0] : inv.customer,
    job: Array.isArray(inv.job) ? inv.job[0] : inv.job,
  }))

  // Calculate stats
  const today = new Date().toISOString().split('T')[0]
  const stats = {
    total_outstanding: 0,
    total_overdue: 0,
    draft_count: 0,
    paid_count: 0,
    overdue_count: 0,
  }

  for (const inv of invoices) {
    if (inv.status === 'void' || inv.status === 'paid') {
      if (inv.status === 'paid') stats.paid_count++
      continue
    }

    stats.total_outstanding += inv.balance_due || 0

    if (inv.status === 'draft') {
      stats.draft_count++
    } else if (inv.due_date < today && inv.balance_due > 0) {
      stats.total_overdue += inv.balance_due
      stats.overdue_count++
    }
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage customer invoices and payments
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Outstanding</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.total_outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.total_overdue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Drafts</span>
            </div>
            <p className="text-2xl font-bold">{stats.draft_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Overdue Count</span>
            </div>
            <p className="text-2xl font-bold">{stats.overdue_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
            <p className="text-2xl font-bold">{stats.paid_count}</p>
          </CardContent>
        </Card>
      </div>

      <InvoicesDataTable data={invoices} />
    </div>
  )
}
