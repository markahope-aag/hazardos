import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Building,
  Clock,
  TrendingUp,
  History,
} from 'lucide-react'
import { OpportunityActions } from '@/components/pipeline/opportunity-actions'
import { formatCurrency } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

function getOutcomeBadge(outcome: string | null) {
  if (!outcome) return null
  switch (outcome) {
    case 'won':
      return <Badge className="bg-green-500">Won</Badge>
    case 'lost':
      return <Badge variant="destructive">Lost</Badge>
    case 'abandoned':
      return <Badge variant="secondary">Abandoned</Badge>
    default:
      return null
  }
}

export default async function OpportunityDetailPage({ params }: Props) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const [opportunity, stages, history] = await Promise.all([
    PipelineService.getOpportunity(id),
    PipelineService.getStages(),
    PipelineService.getOpportunityHistory(id),
  ])

  if (!opportunity) {
    notFound()
  }

  const customerName = opportunity.customer?.company_name ||
    `${opportunity.customer?.first_name || ''} ${opportunity.customer?.last_name || ''}`.trim() ||
    'Unknown Customer'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pipeline">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{opportunity.name}</h1>
              {getOutcomeBadge(opportunity.outcome)}
            </div>
            <p className="text-muted-foreground">{customerName}</p>
          </div>
        </div>

        <OpportunityActions opportunity={opportunity} stages={stages} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunity.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p>{opportunity.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: opportunity.stage?.color || '#6366f1' }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Stage</p>
                    <p className="font-medium">{opportunity.stage?.name || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Probability</p>
                    <p className="font-medium">{opportunity.stage?.probability || 0}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{opportunity.owner?.full_name || 'Unassigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Close</p>
                    <p className="font-medium">
                      {opportunity.expected_close_date
                        ? new Date(opportunity.expected_close_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {opportunity.loss_reason && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Loss Reason</h4>
                    <Badge variant="destructive">{opportunity.loss_reason}</Badge>
                    {opportunity.loss_notes && (
                      <p className="mt-2 text-sm">{opportunity.loss_notes}</p>
                    )}
                    {opportunity.competitor && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Competitor: {opportunity.competitor}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Stage History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No history yet</p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry, idx) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="relative">
                        <div
                          className="w-3 h-3 rounded-full mt-1"
                          style={{ backgroundColor: entry.to_stage?.color || '#6366f1' }}
                        />
                        {idx < history.length - 1 && (
                          <div className="absolute top-4 left-1.5 w-0.5 h-full -ml-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.from_stage ? (
                              <>
                                {entry.from_stage.name} → {entry.to_stage?.name}
                              </>
                            ) : (
                              <>Created in {entry.to_stage?.name}</>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.changed_by_user?.full_name || 'Unknown'} •{' '}
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                        {entry.notes && (
                          <p className="text-sm mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(opportunity.estimated_value || 0, false)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weighted Value</p>
                <p className="text-xl font-semibold text-primary">
                  {formatCurrency(opportunity.weighted_value || 0, false)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {opportunity.stage?.probability || 0}% probability
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{customerName}</p>
              {opportunity.customer?.id && (
                <Button variant="link" asChild className="p-0 h-auto mt-2">
                  <Link href={`/customers/${opportunity.customer.id}`}>
                    View Customer →
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(opportunity.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{new Date(opportunity.updated_at).toLocaleDateString()}</span>
              </div>
              {opportunity.actual_close_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span>{new Date(opportunity.actual_close_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Items */}
          {(opportunity.estimate_id || opportunity.proposal_id || opportunity.job_id) && (
            <Card>
              <CardHeader>
                <CardTitle>Related Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {opportunity.estimate_id && (
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href={`/estimates/${opportunity.estimate_id}`}>
                      View Estimate →
                    </Link>
                  </Button>
                )}
                {opportunity.proposal_id && (
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href={`/proposals/${opportunity.proposal_id}`}>
                      View Proposal →
                    </Link>
                  </Button>
                )}
                {opportunity.job_id && (
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href={`/jobs/${opportunity.job_id}`}>
                      View Job →
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
