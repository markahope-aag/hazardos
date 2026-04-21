'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Building2, User, MapPin, AlertCircle, DollarSign, Target,
  TrendingUp, Calendar, Shield, Briefcase, History, CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

const PROPERTY_LABELS: Record<string, string> = {
  residential_single_family: 'Residential (Single Family)',
  residential_multi_family: 'Residential (Multi-Family)',
  commercial: 'Commercial',
  industrial: 'Industrial',
  government: 'Government',
}

const URGENCY_COLORS: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-600',
  urgent: 'bg-yellow-100 text-yellow-700',
  emergency: 'bg-red-100 text-red-700',
}

const TRIGGER_LABELS: Record<string, string> = {
  inspection_required: 'Inspection Required',
  sale_pending: 'Sale Pending',
  tenant_complaint: 'Tenant Complaint',
  voluntary: 'Voluntary',
}

const LOSS_REASONS = ['price', 'competitor', 'no_decision', 'project_cancelled', 'timing', 'other']

interface Props { params: Promise<{ id: string }> }

export default function OpportunityDetailPage({ params }: Props) {
  const { id } = use(params)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'assessment' | 'estimate' | 'activity' | 'jobs'>('overview')
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostForm, setLostForm] = useState({ reason: '', competitor: '', notes: '', followup_date: '' })

  const { data: opp, isLoading, error } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          stage:pipeline_stages!stage_id(id, name, color, probability, stage_type),
          customer:customers!customer_id(id, name, first_name, last_name, company_name, company_id)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return {
        ...data,
        stage: Array.isArray(data.stage) ? data.stage[0] : data.stage,
        customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
      }
    },
    enabled: !!id,
  })

  const markWon = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('opportunities').update({
        outcome: 'won', opportunity_status: 'won', actual_close_date: new Date().toISOString().split('T')[0],
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      toast({ title: 'Opportunity marked as Won' })
    },
  })

  const markLost = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('opportunities').update({
        outcome: 'lost',
        opportunity_status: 'lost',
        actual_close_date: new Date().toISOString().split('T')[0],
        loss_reason: lostForm.reason || null,
        lost_to_competitor: lostForm.competitor || null,
        loss_notes: lostForm.notes || null,
        follow_up_date: lostForm.followup_date || null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      setShowLostModal(false)
      toast({ title: 'Opportunity marked as Lost' })
    },
  })

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  }
  if (error || !opp) {
    return <Card><CardContent className="p-6 text-center"><AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" /><h2 className="text-lg font-semibold">Opportunity Not Found</h2></CardContent></Card>
  }

  const contactName = opp.customer ? [opp.customer.first_name, opp.customer.last_name].filter(Boolean).join(' ') || opp.customer.name : 'Unknown'
  const serviceAddr = [opp.service_address_line1, opp.service_city, opp.service_state, opp.service_zip].filter(Boolean).join(', ')
  const isOpen = !opp.outcome

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'assessment' as const, label: 'Assessment' },
    { id: 'estimate' as const, label: 'Estimate' },
    { id: 'activity' as const, label: 'Activity' },
    { id: 'jobs' as const, label: 'Jobs' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/opportunities"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {opp.name}
              {opp.outcome === 'won' && <Badge className="bg-green-500">Won</Badge>}
              {opp.outcome === 'lost' && <Badge variant="destructive">Lost</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">{contactName}{opp.customer?.company_name ? ` · ${opp.customer.company_name}` : ''}</p>
          </div>
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => markWon.mutate()} disabled={markWon.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />Won
            </Button>
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowLostModal(true)}>
              <XCircle className="h-4 w-4 mr-2" />Lost
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Stage & Status */}
              <div className="flex flex-wrap gap-2">
                {opp.stage && <Badge style={{ backgroundColor: opp.stage.color, color: 'white' }} className="border-0">{opp.stage.name}</Badge>}
                {opp.opportunity_status && <Badge variant="outline" className="capitalize">{opp.opportunity_status.replace(/_/g, ' ')}</Badge>}
                {opp.urgency && opp.urgency !== 'routine' && <Badge className={`border-0 ${URGENCY_COLORS[opp.urgency]}`}>{opp.urgency}</Badge>}
              </div>

              <Separator />

              {/* Contacts */}
              <div className="space-y-2 text-sm">
                {opp.customer && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/crm/contacts/${opp.customer.id}`} className="hover:underline">{contactName}</Link>
                  </div>
                )}
                {opp.customer?.company_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {opp.customer.company_id ? (
                      <Link href={`/crm/companies/${opp.customer.company_id}`} className="hover:underline">{opp.customer.company_name}</Link>
                    ) : (
                      <span>{opp.customer.company_name}</span>
                    )}
                  </div>
                )}
                {serviceAddr && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{serviceAddr}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Hazards */}
              {opp.hazard_types?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hazards</p>
                  <div className="flex flex-wrap gap-1">
                    {opp.hazard_types.map((h: string) => <Badge key={h} variant="outline" className="text-xs">{h.replace(/_/g, ' ')}</Badge>)}
                  </div>
                </div>
              )}
              {opp.property_type && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p>{PROPERTY_LABELS[opp.property_type] || opp.property_type}</p>
                </div>
              )}

              <Separator />

              {/* Value */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Estimated</span>
                  <span className="font-bold">{opp.estimated_value ? formatCurrency(opp.estimated_value, false) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Weighted</span>
                  <span className="font-medium text-primary">{opp.weighted_value ? formatCurrency(opp.weighted_value, false) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Probability</span>
                  <span className="font-medium">{opp.probability_pct || opp.stage?.probability || 0}%</span>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-1 text-sm">
                {opp.expected_close_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Expected Close</span>
                    <span>{new Date(opp.expected_close_date).toLocaleDateString()}</span>
                  </div>
                )}
                {opp.actual_close_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Closed</span>
                    <span>{new Date(opp.actual_close_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loss Info */}
          {opp.outcome === 'lost' && (opp.loss_reason || opp.lost_to_competitor) && (
            <Card className="border-red-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Loss Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {opp.loss_reason && <div><span className="text-muted-foreground">Reason:</span> <span className="capitalize">{opp.loss_reason.replace(/_/g, ' ')}</span></div>}
                {opp.lost_to_competitor && <div><span className="text-muted-foreground">Competitor:</span> {opp.lost_to_competitor}</div>}
                {opp.loss_notes && <div><span className="text-muted-foreground">Notes:</span> {opp.loss_notes}</div>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Main Content */}
        <div className="space-y-4">
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >{tab.label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Regulatory & Property Details */}
              <Card>
                <CardHeader><CardTitle className="text-base">Site Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {opp.regulatory_trigger && (
                      <div><p className="text-muted-foreground">Regulatory Trigger</p><p className="font-medium flex items-center gap-1"><Shield className="h-3 w-3" />{TRIGGER_LABELS[opp.regulatory_trigger] || opp.regulatory_trigger}</p></div>
                    )}
                    {opp.property_age && (
                      <div><p className="text-muted-foreground">Year Built</p><p className="font-medium">{opp.property_age}</p></div>
                    )}
                    {opp.estimated_affected_area_sqft && (
                      <div><p className="text-muted-foreground">Est. Affected Area</p><p className="font-medium">{opp.estimated_affected_area_sqft.toLocaleString()} sq ft</p></div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Dates */}
              <Card>
                <CardHeader><CardTitle className="text-base">Key Dates</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Assessment</p><p className="font-medium">{opp.assessment_date ? new Date(opp.assessment_date).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">Estimate Sent</p><p className="font-medium">{opp.estimate_sent_date ? new Date(opp.estimate_sent_date).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">Follow-up</p><p className={`font-medium ${opp.follow_up_date && new Date(opp.follow_up_date) < new Date() ? 'text-destructive' : ''}`}>{opp.follow_up_date ? new Date(opp.follow_up_date).toLocaleDateString() : '—'}</p></div>
                    <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(opp.created_at).toLocaleDateString()}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Attribution */}
              {(opp.lead_source || opp.first_touch_source) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Attribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {opp.lead_source && <div><p className="text-muted-foreground">Lead Source</p><p className="font-medium">{opp.lead_source}</p>{opp.lead_source_detail && <p className="text-xs text-muted-foreground">{opp.lead_source_detail}</p>}</div>}
                      {opp.first_touch_source && <div><p className="text-muted-foreground">First Touch</p><p className="font-medium">{opp.first_touch_source}</p></div>}
                      {opp.last_touch_source && <div><p className="text-muted-foreground">Last Touch</p><p className="font-medium">{opp.last_touch_source}</p></div>}
                      {opp.converting_touch_source && <div><p className="text-muted-foreground">Converting Touch</p><p className="font-medium">{opp.converting_touch_source}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {opp.description && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{opp.description}</p></CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'assessment' && (
            <Card><CardContent className="p-6 text-center py-12">
              {opp.created_from_assessment_id ? (
                <div>
                  <p className="text-sm mb-4">This opportunity was created from an assessment.</p>
                  <Button asChild><Link href={`/site-surveys/${opp.created_from_assessment_id}`}>View Assessment</Link></Button>
                </div>
              ) : (
                <div>
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Assessment Linked</h3>
                  <p className="text-muted-foreground mb-4">Schedule a site assessment for this opportunity</p>
                  <Button asChild><Link href="/site-surveys/new">Schedule Assessment</Link></Button>
                </div>
              )}
            </CardContent></Card>
          )}

          {activeTab === 'estimate' && (
            <Card><CardContent className="p-6 text-center py-12">
              {opp.estimate_id ? (
                <div>
                  <p className="text-sm mb-4">An estimate is linked to this opportunity.</p>
                  <Button asChild><Link href={`/estimates/${opp.estimate_id}`}>View Estimate</Link></Button>
                </div>
              ) : (
                <div>
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Estimate Yet</h3>
                  <p className="text-muted-foreground mb-4">Create an estimate for this opportunity</p>
                  <Button asChild><Link href="/estimates/new">Create Estimate</Link></Button>
                </div>
              )}
            </CardContent></Card>
          )}

          {activeTab === 'activity' && (
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="h-5 w-5" />Activity</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground text-center py-8">Activity feed will appear here</p></CardContent>
            </Card>
          )}

          {activeTab === 'jobs' && (
            <Card><CardContent className="p-6 text-center py-12">
              {opp.job_id ? (
                <div>
                  <p className="text-sm mb-4">A job has been created from this opportunity.</p>
                  <Button asChild><Link href={`/jobs/${opp.job_id}`}>View Job</Link></Button>
                </div>
              ) : opp.outcome === 'won' ? (
                <div>
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready for Job Creation</h3>
                  <p className="text-muted-foreground mb-4">This opportunity was won — create a job to begin work</p>
                  <Button asChild><Link href="/jobs/new">Create Job</Link></Button>
                </div>
              ) : (
                <div>
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Job Yet</h3>
                  <p className="text-muted-foreground">Jobs are created when an opportunity is won</p>
                </div>
              )}
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Lost Reason Modal */}
      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Lost</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Lost Reason</Label>
              <Select value={lostForm.reason} onValueChange={(v) => setLostForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lost to Competitor</Label>
              <Input value={lostForm.competitor} onChange={(e) => setLostForm(f => ({ ...f, competitor: e.target.value }))} placeholder="Competitor name" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={lostForm.notes} onChange={(e) => setLostForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Additional context..." />
            </div>
            <div>
              <Label>Schedule Follow-up</Label>
              <Input type="date" value={lostForm.followup_date} onChange={(e) => setLostForm(f => ({ ...f, followup_date: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Optional — check back later</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => markLost.mutate()} disabled={markLost.isPending}>
              {markLost.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
