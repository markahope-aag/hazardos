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
  ArrowLeft, Building2, User, MapPin, AlertCircle, DollarSign, Briefcase,
  Shield, Calendar, Users, FileText, Clock, Loader2, CheckCircle, TrendingUp,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  invoiced: { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

const CONTAINMENT_LABELS: Record<string, string> = {
  type_i: 'Type I (Mini)',
  type_ii: 'Type II (Standard)',
  type_iii: 'Type III (Large/Complex)',
}

interface Props { params: Promise<{ id: string }> }

export default function JobDetailPage({ params }: Props) {
  const { id } = use(params)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'crew' | 'documents' | 'activity'>('overview')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: '', notes: '', actual_hours: '' })

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['crm-job', id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!customer_id(id, name, first_name, last_name, company_name, company_id),
          company:companies!company_id(id, name)
        `)
        .eq('id', id).single()
      if (error) throw error
      return {
        ...data,
        customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
        company: Array.isArray(data.company) ? data.company[0] : data.company,
      }
    },
    enabled: !!id,
  })

  const updateStatus = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const updates: Record<string, unknown> = { status: statusForm.status, internal_notes: statusForm.notes || undefined }
      if (statusForm.status === 'completed') {
        updates.actual_end_at = new Date().toISOString()
        if (statusForm.actual_hours) updates.actual_labor_hours = parseFloat(statusForm.actual_hours)
      }
      if (statusForm.status === 'in_progress' && !job?.actual_start_at) {
        updates.actual_start_at = new Date().toISOString()
      }
      const { error } = await supabase.from('jobs').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-job', id] })
      setShowStatusModal(false)
      toast({ title: 'Job status updated' })
    },
  })

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  if (error || !job) return <Card><CardContent className="p-6 text-center"><AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" /><h2 className="text-lg font-semibold">Job Not Found</h2></CardContent></Card>

  const contactName = job.customer ? [job.customer.first_name, job.customer.last_name].filter(Boolean).join(' ') || job.customer.name : null
  const companyName = job.company?.name || job.customer?.company_name
  const sc = STATUS_CONFIG[job.status] || { label: job.status, color: '' }
  const address = [job.job_address, job.job_city, job.job_state, job.job_zip].filter(Boolean).join(', ')

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'financials' as const, label: 'Financials' },
    { id: 'crew' as const, label: 'Crew & Schedule' },
    { id: 'documents' as const, label: 'Documents' },
    { id: 'activity' as const, label: 'Activity' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/crm/jobs"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">{job.job_number}<Badge className={`border-0 ${sc.color}`}>{sc.label}</Badge></h1>
            <p className="text-sm text-muted-foreground">{job.name}</p>
          </div>
        </div>
        <Button onClick={() => { setStatusForm({ status: job.status, notes: '', actual_hours: '' }); setShowStatusModal(true) }}>
          Update Status
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Company / Contact */}
              <div className="space-y-2 text-sm">
                {companyName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {job.company?.id ? (
                      <Link href={`/crm/companies/${job.company.id}`} className="hover:underline font-medium">{companyName}</Link>
                    ) : <span className="font-medium">{companyName}</span>}
                  </div>
                )}
                {contactName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/crm/contacts/${job.customer?.id}`} className="hover:underline">{contactName}</Link>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{address}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Hazards & Containment */}
              {job.hazard_types?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hazards</p>
                  <div className="flex flex-wrap gap-1">
                    {job.hazard_types.map((h: string) => <Badge key={h} variant="outline" className="text-xs">{h.replace(/_/g, ' ')}</Badge>)}
                  </div>
                </div>
              )}
              {job.containment_level && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Containment</p>
                  <p className="flex items-center gap-1"><Shield className="h-3 w-3" />{CONTAINMENT_LABELS[job.containment_level] || job.containment_level}</p>
                </div>
              )}

              <Separator />

              {/* Schedule */}
              <div className="space-y-1 text-sm">
                {job.scheduled_start_date && (
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Start</span><span>{new Date(job.scheduled_start_date).toLocaleDateString()}</span></div>
                )}
                {job.scheduled_end_date && (
                  <div className="flex justify-between"><span className="text-muted-foreground">End</span><span>{new Date(job.scheduled_end_date).toLocaleDateString()}</span></div>
                )}
              </div>

              <Separator />

              {/* Revenue */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Revenue</span>
                <span className="font-bold">{formatCurrency(job.actual_revenue || job.estimated_revenue || job.contract_amount || 0, false)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Variance (Ralph Wiggum Loop) */}
          {(job.estimate_variance_pct != null || job.job_complexity_rating || job.customer_satisfaction_score) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Learning Loop</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {job.estimate_variance_pct != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Est. Variance</span><span className={job.estimate_variance_pct > 10 ? 'text-destructive font-medium' : ''}>{job.estimate_variance_pct}%</span></div>
                )}
                {job.variance_reason && <div className="flex justify-between"><span className="text-muted-foreground">Reason</span><span className="capitalize">{job.variance_reason.replace(/_/g, ' ')}</span></div>}
                {job.job_complexity_rating && <div className="flex justify-between"><span className="text-muted-foreground">Complexity</span><span>{job.job_complexity_rating}/5</span></div>}
                {job.customer_satisfaction_score && <div className="flex justify-between"><span className="text-muted-foreground">Satisfaction</span><span>{job.customer_satisfaction_score}/5</span></div>}
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
              {job.opportunity_id && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Linked Opportunity</CardTitle></CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild><Link href={`/crm/opportunities/${job.opportunity_id}`}>View Opportunity &rarr;</Link></Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Air Monitoring</p><p className="font-medium">{job.air_monitoring_required ? 'Required' : 'Not required'}</p></div>
                    <div><p className="text-muted-foreground">Clearance Testing</p><p className="font-medium">{job.clearance_testing_required ? 'Required' : 'Not required'}</p></div>
                    {job.permit_numbers?.length > 0 && (
                      <div><p className="text-muted-foreground">Permits</p><div className="flex flex-wrap gap-1">{job.permit_numbers.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-xs font-mono">{p}</Badge>)}</div></div>
                    )}
                    {job.disposal_manifest_numbers?.length > 0 && (
                      <div><p className="text-muted-foreground">Disposal Manifests</p><div className="flex flex-wrap gap-1">{job.disposal_manifest_numbers.map((m: string, i: number) => <Badge key={i} variant="outline" className="text-xs font-mono">{m}</Badge>)}</div></div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(job.internal_notes || job.special_instructions) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {job.special_instructions && <div><p className="text-muted-foreground font-medium">Special Instructions</p><p className="whitespace-pre-wrap">{job.special_instructions}</p></div>}
                    {job.internal_notes && <div><p className="text-muted-foreground font-medium">Internal Notes</p><p className="whitespace-pre-wrap">{job.internal_notes}</p></div>}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'financials' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5" />Financials</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <h4 className="font-medium text-muted-foreground">Revenue</h4>
                    <div className="flex justify-between"><span>Estimated</span><span className="font-medium">{formatCurrency(job.estimated_revenue || job.contract_amount || 0, false)}</span></div>
                    <div className="flex justify-between"><span>Actual</span><span className="font-medium">{job.actual_revenue ? formatCurrency(job.actual_revenue, false) : '—'}</span></div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-muted-foreground">Cost</h4>
                    <div className="flex justify-between"><span>Estimated</span><span className="font-medium">{job.estimated_cost ? formatCurrency(job.estimated_cost, false) : '—'}</span></div>
                    <div className="flex justify-between"><span>Actual</span><span className="font-medium">{job.actual_cost ? formatCurrency(job.actual_cost, false) : '—'}</span></div>
                  </div>
                  {job.gross_margin_pct != null && (
                    <div className="col-span-2"><div className="flex justify-between border-t pt-3"><span className="font-medium">Gross Margin</span><span className="font-bold text-lg">{job.gross_margin_pct}%</span></div></div>
                  )}
                  <Separator className="col-span-2" />
                  <div className="space-y-3">
                    <h4 className="font-medium text-muted-foreground">Deposit</h4>
                    <div className="flex justify-between"><span>Amount</span><span>{job.deposit_amount ? formatCurrency(job.deposit_amount, false) : '—'}</span></div>
                    <div className="flex justify-between"><span>Received</span><span>{job.deposit_received_date ? new Date(job.deposit_received_date).toLocaleDateString() : '—'}</span></div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-muted-foreground">Invoice</h4>
                    <div className="flex justify-between"><span>Invoice Date</span><span>{job.final_invoice_date ? new Date(job.final_invoice_date).toLocaleDateString() : '—'}</span></div>
                    <div className="flex justify-between"><span>Payment Date</span><span>{job.final_payment_date ? new Date(job.final_payment_date).toLocaleDateString() : '—'}</span></div>
                    {job.invoice_id && <div className="flex justify-between"><span>QB Invoice</span><span className="font-mono text-xs">{job.invoice_id}</span></div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'crew' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" />Crew & Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div><p className="text-muted-foreground">Estimated Hours</p><p className="font-medium">{job.estimated_labor_hours || job.estimated_duration_hours || '—'}</p></div>
                  <div><p className="text-muted-foreground">Actual Hours</p><p className="font-medium">{job.actual_labor_hours || '—'}</p></div>
                  <div><p className="text-muted-foreground">Actual Start</p><p className="font-medium">{job.actual_start_at ? new Date(job.actual_start_at).toLocaleString() : '—'}</p></div>
                  <div><p className="text-muted-foreground">Actual End</p><p className="font-medium">{job.actual_end_at ? new Date(job.actual_end_at).toLocaleString() : '—'}</p></div>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">Crew assignment details will appear here</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'documents' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5" />Documents</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground text-center py-8">Permits, manifests, clearance reports, and photos will appear here</p></CardContent>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-5 w-5" />Activity</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground text-center py-8">Activity feed will appear here</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Job Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Status</Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {statusForm.status === 'completed' && (
              <div>
                <Label>Actual Labor Hours</Label>
                <Input type="number" step="0.5" value={statusForm.actual_hours} onChange={(e) => setStatusForm(f => ({ ...f, actual_hours: e.target.value }))} placeholder="e.g., 24.5" />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={statusForm.notes} onChange={(e) => setStatusForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Status update notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button onClick={() => updateStatus.mutate()} disabled={updateStatus.isPending || statusForm.status === job?.status}>
              {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
