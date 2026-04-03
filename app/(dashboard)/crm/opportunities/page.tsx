import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, DollarSign, Target, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function OpportunitiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [opportunitiesResult, metrics] = await Promise.all([
    PipelineService.getOpportunities(),
    PipelineService.getPipelineMetrics(),
  ])

  const opportunities = opportunitiesResult.opportunities

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">
            All open and closed opportunities
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/opportunities/new">
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.count}</div>
            <p className="text-xs text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_value, false)}</div>
            <p className="text-xs text-muted-foreground">Total estimated value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.weighted_value, false)}</div>
            <p className="text-xs text-muted-foreground">Probability-adjusted value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Opportunities
            <span className="text-sm font-normal text-gray-500">({opportunities.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities yet</h3>
              <p className="text-gray-500 mb-4">Create your first opportunity to start tracking your sales pipeline</p>
              <Button asChild>
                <Link href="/crm/opportunities/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Opportunity
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell>
                      <Link href={`/crm/opportunities/${opp.id}`} className="font-medium text-primary hover:underline">
                        {opp.name}
                      </Link>
                      {opp.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">{opp.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {opp.customer ? (
                        <Link href={`/crm/contacts/${opp.customer.id}`} className="text-sm hover:underline">
                          {opp.customer.company_name || opp.customer.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opp.stage && (
                        <Badge
                          style={{ backgroundColor: opp.stage.color, color: 'white' }}
                          className="border-0"
                        >
                          {opp.stage.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {opp.estimated_value ? (
                        <div>
                          <div className="font-medium">{formatCurrency(opp.estimated_value, false)}</div>
                          {opp.weighted_value && (
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(opp.weighted_value, false)} weighted
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opp.expected_close_date
                        ? new Date(opp.expected_close_date).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {opp.owner?.full_name || '—'}
                    </TableCell>
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
