import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server-auth'
import { ROLES } from '@/lib/auth/roles'
import { CommissionService } from '@/lib/services/commission-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Clock, CheckCircle, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CommissionEarningsTable } from '@/components/sales/commission-earnings-table'

export default async function CommissionsPage() {

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [profile, summary, earningsResult] = await Promise.all([
    getCurrentProfile(),
    CommissionService.getSummary(),
    CommissionService.getEarnings(),
  ])

  const earnings = earningsResult.earnings
  const canManage = ROLES.TENANT_ADMIN.includes(profile?.role ?? '')

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
            <div className="text-2xl font-bold">{formatCurrency(summary.total_pending, false)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_approved, false)}</div>
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.this_month, false)}</div>
            <p className="text-xs text-muted-foreground">Earned this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid YTD</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_paid, false)}</div>
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
          <CommissionEarningsTable earnings={earnings} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  )
}
