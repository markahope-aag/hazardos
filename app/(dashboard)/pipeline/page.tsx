import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, DollarSign, Target, TrendingUp } from 'lucide-react'

// Lazy load PipelineKanban (contains @dnd-kit/core ~50KB)
const PipelineKanban = dynamic(
  () => import('@/components/pipeline/pipeline-kanban').then(mod => ({ default: mod.PipelineKanban })),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-shrink-0 w-72 rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse mb-3" />
            <div className="space-y-2 min-h-[200px]">
              {[1, 2].map(j => (
                <Card key={j}>
                  <CardContent className="p-3">
                    <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  }
)

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents)
}

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stages, opportunities, metrics] = await Promise.all([
    PipelineService.getStages(),
    PipelineService.getOpportunities(),
    PipelineService.getPipelineMetrics(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track opportunities through your sales process
          </p>
        </div>
        <Button asChild>
          <Link href="/pipeline/new">
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Link>
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.count}</div>
            <p className="text-xs text-muted-foreground">
              Active opportunities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_value)}</div>
            <p className="text-xs text-muted-foreground">
              Total estimated value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.weighted_value)}</div>
            <p className="text-xs text-muted-foreground">
              Probability-adjusted value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <PipelineKanban stages={stages} opportunities={opportunities} />
    </div>
  )
}
