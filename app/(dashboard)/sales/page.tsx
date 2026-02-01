import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { CommissionService } from '@/lib/services/commission-service'
import { ApprovalService } from '@/lib/services/approval-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Kanban,
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  ArrowRight,
  Target,
} from 'lucide-react'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents)
}

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pipelineMetrics, commissionSummary, pendingApprovals] = await Promise.all([
    PipelineService.getPipelineMetrics(),
    CommissionService.getSummary(),
    ApprovalService.getPendingCount(),
  ])

  const salesTools = [
    {
      title: 'Sales Pipeline',
      description: 'Manage opportunities through your sales stages',
      href: '/pipeline',
      icon: Kanban,
      stats: `${pipelineMetrics.count} opportunities`,
      value: formatCurrency(pipelineMetrics.weighted_value),
      valueLabel: 'Weighted value',
    },
    {
      title: 'Commission Tracking',
      description: 'Track and manage sales commissions',
      href: '/sales/commissions',
      icon: DollarSign,
      stats: formatCurrency(commissionSummary.this_month),
      value: formatCurrency(commissionSummary.total_pending),
      valueLabel: 'Pending approval',
    },
    {
      title: 'Win/Loss Analysis',
      description: 'Analyze won and lost opportunities',
      href: '/sales/win-loss',
      icon: TrendingUp,
      stats: 'Track performance',
      value: 'View insights',
      valueLabel: 'Improve close rates',
    },
    {
      title: 'Approval Queue',
      description: 'Review estimates, discounts, and proposals',
      href: '/sales/approvals',
      icon: ClipboardCheck,
      stats: `${pendingApprovals} pending`,
      value: pendingApprovals > 0 ? 'Action required' : 'All clear',
      valueLabel: pendingApprovals > 0 ? 'Items need review' : 'No pending items',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Tools</h1>
        <p className="text-muted-foreground">
          Manage your sales pipeline, track commissions, and analyze performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pipelineMetrics.total_value)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pipelineMetrics.weighted_value)} weighted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(commissionSummary.this_month)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(commissionSummary.this_quarter)} this quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              {pendingApprovals > 0 ? 'Items need review' : 'All caught up'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tool Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {salesTools.map((tool) => (
          <Card key={tool.href} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <tool.icon className="h-6 w-6 text-primary" />
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={tool.href}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardTitle className="mt-4">{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{tool.stats}</p>
                  <p className="text-xs text-muted-foreground">{tool.valueLabel}</p>
                </div>
                <Button asChild>
                  <Link href={tool.href}>
                    Open
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
