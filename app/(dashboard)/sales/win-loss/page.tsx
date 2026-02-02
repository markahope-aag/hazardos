import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, XCircle, TrendingUp, PieChart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function WinLossPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [wonOpps, lostOpps, lossReasons] = await Promise.all([
    PipelineService.getWonOpportunities(),
    PipelineService.getLostOpportunities(),
    PipelineService.getLossReasonStats(),
  ])

  const totalWon = wonOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
  const totalLost = lostOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
  const winRate = wonOpps.length + lostOpps.length > 0
    ? (wonOpps.length / (wonOpps.length + lostOpps.length)) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Win/Loss Analysis</h1>
        <p className="text-muted-foreground">
          Track won and lost opportunities to improve your sales process
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{wonOpps.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalWon, false)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Deals</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lostOpps.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalLost, false)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {wonOpps.length + lostOpps.length} total opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(wonOpps.length > 0 ? totalWon / wonOpps.length : 0, false)}
            </div>
            <p className="text-xs text-muted-foreground">Won deals average</p>
          </CardContent>
        </Card>
      </div>

      {/* Loss Reasons */}
      {lossReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loss Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lossReasons.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.reason}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({((item.count / lostOpps.length) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(item.count / lostOpps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Won/Lost Tables */}
      <Tabs defaultValue="won" className="space-y-4">
        <TabsList>
          <TabsTrigger value="won">
            Won ({wonOpps.length})
          </TabsTrigger>
          <TabsTrigger value="lost">
            Lost ({lostOpps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="won">
          <Card>
            <CardHeader>
              <CardTitle>Won Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {wonOpps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No won opportunities yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opportunity</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Close Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wonOpps.map(opp => (
                      <TableRow key={opp.id}>
                        <TableCell>
                          <Link
                            href={`/pipeline/${opp.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {opp.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {opp.customer?.company_name ||
                            `${opp.customer?.first_name || ''} ${opp.customer?.last_name || ''}`.trim() ||
                            'Unknown'}
                        </TableCell>
                        <TableCell>{opp.owner?.full_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(opp.estimated_value || 0, false)}
                        </TableCell>
                        <TableCell>
                          {opp.actual_close_date
                            ? new Date(opp.actual_close_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lost">
          <Card>
            <CardHeader>
              <CardTitle>Lost Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {lostOpps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lost opportunities yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Opportunity</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Loss Reason</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Close Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lostOpps.map(opp => (
                      <TableRow key={opp.id}>
                        <TableCell>
                          <Link
                            href={`/pipeline/${opp.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {opp.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {opp.customer?.company_name ||
                            `${opp.customer?.first_name || ''} ${opp.customer?.last_name || ''}`.trim() ||
                            'Unknown'}
                        </TableCell>
                        <TableCell>
                          {opp.loss_reason ? (
                            <Badge variant="destructive">{opp.loss_reason}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCurrency(opp.estimated_value || 0, false)}
                        </TableCell>
                        <TableCell>
                          {opp.actual_close_date
                            ? new Date(opp.actual_close_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
