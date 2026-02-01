import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommissionService } from '@/lib/services/commission-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, Clock, CheckCircle, Wallet } from 'lucide-react'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>
    case 'approved':
      return <Badge variant="default">Approved</Badge>
    case 'paid':
      return <Badge className="bg-green-500">Paid</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function CommissionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [summary, earnings] = await Promise.all([
    CommissionService.getSummary(),
    CommissionService.getEarnings(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commission Tracking</h1>
        <p className="text-muted-foreground">
          Track and manage sales commissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_pending)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_approved)}</div>
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.this_month)}</div>
            <p className="text-xs text-muted-foreground">Earned this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid YTD</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_paid)}</div>
            <p className="text-xs text-muted-foreground">Total paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commission earnings yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Base Amount</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map(earning => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      {new Date(earning.earning_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{earning.user?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{earning.plan?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(earning.base_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {earning.commission_rate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(earning.commission_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(earning.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
