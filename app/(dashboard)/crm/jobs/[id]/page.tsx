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
  ArrowLeft, Building2, User, MapPin, AlertCircle, DollarSign,
  Shield, Calendar, Users, FileText, Clock, Loader2,
  CheckCircle2, Circle, MinusCircle, Phone,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { eachDayOfInterval, format } from 'date-fns'

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

function getPaymentStatus(job: Record<string, unknown>): { label: string; color: string } {
  if (job.status === 'paid' || job.final_payment_date) return { label: 'Paid in Full', color: 'bg-emerald-100 text-emerald-700' }
  if (job.deposit_received_date) return { label: 'Deposit Received', color: 'bg-blue-100 text-blue-700' }
  if (job.final_invoice_date || job.status === 'invoiced') return { label: 'Invoiced', color: 'bg-purple-100 text-purple-700' }
  return { label: 'Unpaid', color: 'bg-gray-100 text-gray-500' }
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
          company:companies!company_id(id, name),
          crew_lead_profile:profiles!crew_lead_id(id, first_name, last_name, full_name)
        `)
        .eq('id', id).single()
      if (error) throw error
      return {
        ...data,
        customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
        company: Array.isArray(data.company) ? data.company[0] : data.company,
        crew_lead_profile: Array.isArray(data.crew_lead_profile) ? data.crew_lead_profile[0] : data.crew_lead_profile,
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
  const crewLeadName = job.crew_lead_profile ? (job.crew_lead_profile.full_name || [job.crew_lead_profile.first_name, job.crew_lead_profile.last_name].filter(Boolean).join(' ')) : null
  const sc = STATUS_CONFIG[job.status] || { label: job.status, color: '' }
  const ps = getPaymentStatus(job)
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
              {/* Company / Contact / Crew Lead */}
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
                {crewLeadName && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Crew Lead</p>
                      <p className="font-medium">{crewLeadName}</p>
                    </div>
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
                  <p className="text-xs text-muted-foreground">Containment Level</p>
                  <p className="font-medium flex items-center gap-1"><Shield className="h-3 w-3" />{CONTAINMENT_LABELS[job.containment_level] || job.containment_level}</p>
                </div>
              )}

              <Separator />

              {/* Project Info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Info</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Permit #</span>
                  <span className="font-medium font-mono text-xs">{job.permit_numbers?.[0] || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PO Number</span>
                  <span className="font-medium font-mono text-xs">{job.po_number ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sq. Footage</span>
                  <span className="font-medium">{job.square_footage || job.property_sqft || '—'}</span>
                </div>
                {(job.contact_onsite_name || job.contact_onsite_phone) && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-0.5">Site Contact</p>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{job.contact_onsite_name || '—'}</span>
                      {job.contact_onsite_phone && (
                        <span className="text-muted-foreground ml-1">{job.contact_onsite_phone}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

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

              {/* Revenue + Payment Status */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Revenue</span>
                  <span className="font-bold">{formatCurrency(job.actual_revenue || job.estimated_revenue || job.contract_amount || 0, false)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Payment</span>
                  <Badge className={`text-xs border-0 ${ps.color}`}>{ps.label}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

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
              {/* Job Details */}
              <Card>
                <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {job.opportunity_id && (
                      <div>
                        <p className="text-muted-foreground">Opportunity</p>
                        <Link href={`/crm/opportunities/${job.opportunity_id}`} className="font-medium text-primary hover:underline">View Opportunity &rarr;</Link>
                      </div>
                    )}
                    {job.property_type && (
                      <div>
                        <p className="text-muted-foreground">Property Type</p>
                        <p className="font-medium capitalize">{job.property_type.replace(/_/g, ' ')}</p>
                      </div>
                    )}
                    {job.permit_numbers?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Permit Numbers</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.permit_numbers.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-xs font-mono">{p}</Badge>)}
                        </div>
                      </div>
                    )}
                    {job.disposal_manifest_numbers?.length > 0 && (
                      <div>
                        <p className="text-muted-foreground">Disposal Manifests</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.disposal_manifest_numbers.map((m: string, i: number) => <Badge key={i} variant="outline" className="text-xs font-mono">{m}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance */}
              <Card>
                <CardHeader><CardTitle className="text-base">Compliance</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Air Monitoring</p><p className="font-medium">{job.air_monitoring_required ? 'Required' : 'Not required'}</p></div>
                    <div><p className="text-muted-foreground">Clearance Testing</p><p className="font-medium">{job.clearance_testing_required ? 'Required' : 'Not required'}</p></div>
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

          {activeTab === 'financials' && (() => {
            const lineItems = [
              { label: 'Revenue', estimated: job.estimated_revenue ?? job.contract_amount ?? null, actual: job.actual_revenue ?? null },
              { label: 'Labor Cost', estimated: job.estimated_labor_cost ?? null, actual: job.actual_labor_cost ?? null },
              { label: 'Materials Cost', estimated: job.estimated_material_cost ?? null, actual: job.actual_material_cost ?? null },
              { label: 'Equipment Cost', estimated: job.estimated_equipment_cost ?? null, actual: job.actual_equipment_cost ?? null },
              { label: 'Disposal Cost', estimated: job.estimated_disposal_cost ?? null, actual: job.actual_disposal_cost ?? null },
            ]
            const totalEstCost = [job.estimated_labor_cost, job.estimated_material_cost, job.estimated_equipment_cost, job.estimated_disposal_cost]
              .reduce((sum: number, v: number | null | undefined) => sum + (v ?? 0), 0) || (job.estimated_cost ?? null)
            const totalActCost = [job.actual_labor_cost, job.actual_material_cost, job.actual_equipment_cost, job.actual_disposal_cost]
              .reduce((sum: number, v: number | null | undefined) => sum + (v ?? 0), 0) || (job.actual_cost ?? null)
            const estRev = job.estimated_revenue ?? job.contract_amount ?? 0
            const actRev = job.actual_revenue ?? null
            const estMarginPct = estRev && totalEstCost != null ? ((estRev - (totalEstCost as number)) / estRev * 100) : null
            const actMarginPct = actRev && totalActCost != null ? ((actRev - (totalActCost as number)) / actRev * 100) : null

            const fmtVariance = (est: number | null, act: number | null) => {
              if (est == null || act == null) return '—'
              const diff = act - est
              return (
                <span className={diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}>
                  {diff > 0 ? '+' : ''}{formatCurrency(diff, false)}
                </span>
              )
            }
            const fmtMarginVariance = (est: number | null, act: number | null) => {
              if (est == null || act == null) return '—'
              const diff = act - est
              return (
                <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : ''}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>
              )
            }

            return (
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5" />Estimate vs Actual</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-2 pr-4 font-medium"></th>
                            <th className="text-right py-2 px-4 font-medium">Estimated</th>
                            <th className="text-right py-2 px-4 font-medium">Actual</th>
                            <th className="text-right py-2 pl-4 font-medium">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map(({ label, estimated, actual }) => (
                            <tr key={label} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{label}</td>
                              <td className="py-2 px-4 text-right tabular-nums">{estimated != null ? formatCurrency(estimated, false) : '—'}</td>
                              <td className="py-2 px-4 text-right tabular-nums">{actual != null ? formatCurrency(actual, false) : '—'}</td>
                              <td className="py-2 pl-4 text-right tabular-nums">
                                {label === 'Revenue' ? fmtVariance(estimated, actual) : fmtVariance(estimated, actual)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-semibold">
                            <td className="py-2 pr-4">Total Cost</td>
                            <td className="py-2 px-4 text-right tabular-nums">{totalEstCost != null ? formatCurrency(totalEstCost as number, false) : '—'}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{totalActCost != null ? formatCurrency(totalActCost as number, false) : '—'}</td>
                            <td className="py-2 pl-4 text-right tabular-nums">{fmtVariance(totalEstCost as number | null, totalActCost as number | null)}</td>
                          </tr>
                          <tr className="font-semibold">
                            <td className="py-2 pr-4">Gross Margin</td>
                            <td className="py-2 px-4 text-right tabular-nums">{estMarginPct != null ? `${estMarginPct.toFixed(1)}%` : '—'}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{actMarginPct != null ? `${actMarginPct.toFixed(1)}%` : '—'}</td>
                            <td className="py-2 pl-4 text-right tabular-nums">{fmtMarginVariance(estMarginPct, actMarginPct)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Deposit & Invoice */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Deposit & Invoice</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6 text-sm">
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
                      <div className="col-span-2 border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">QuickBooks Sync</span>
                          {job.invoice_id ? (
                            <Badge className="bg-green-100 text-green-700 border-0">Synced</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 border-0">Not synced</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {activeTab === 'crew' && (() => {
            const startDate = job.scheduled_start_date ? new Date(job.scheduled_start_date) : null
            const endDate = job.scheduled_end_date ? new Date(job.scheduled_end_date) : null
            const scheduleDays = startDate && endDate
              ? eachDayOfInterval({ start: startDate, end: endDate })
              : startDate ? [startDate] : []
            const startTime = job.scheduled_start_time || '8:00 AM'
            const estHours = job.estimated_labor_hours || job.estimated_duration_hours || 8
            const dailyHours = scheduleDays.length > 0 ? Math.round((estHours as number) / scheduleDays.length * 10) / 10 : estHours

            return (
              <div className="space-y-6">
                {/* Daily Schedule */}
                {scheduleDays.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5" />Daily Schedule</CardTitle></CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {scheduleDays.map((day, i) => (
                          <div key={day.toISOString()} className="flex items-center justify-between py-2 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="font-medium w-24">{format(day, 'EEE MMM d')}</span>
                              <span className="text-muted-foreground">Day {i + 1} of {scheduleDays.length}</span>
                            </div>
                            <span className="text-muted-foreground tabular-nums">{startTime} ({dailyHours}h)</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Crew & Hours */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" />Crew</CardTitle>
                      <Button size="sm" variant="outline" disabled>
                        <Users className="h-4 w-4 mr-2" />Assign Crew
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                      <div><p className="text-muted-foreground">Estimated Hours</p><p className="font-medium">{job.estimated_labor_hours || job.estimated_duration_hours || '—'}</p></div>
                      <div><p className="text-muted-foreground">Actual Hours</p><p className="font-medium">{job.actual_labor_hours || '—'}</p></div>
                      <div><p className="text-muted-foreground">Actual Start</p><p className="font-medium">{job.actual_start_at ? new Date(job.actual_start_at).toLocaleString() : '—'}</p></div>
                      <div><p className="text-muted-foreground">Actual End</p><p className="font-medium">{job.actual_end_at ? new Date(job.actual_end_at).toLocaleString() : '—'}</p></div>
                    </div>

                    {crewLeadName && (
                      <div className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{crewLeadName}</p>
                          <p className="text-xs text-muted-foreground">Crew Lead</p>
                        </div>
                        <Badge>Lead</Badge>
                      </div>
                    )}

                    {!crewLeadName && (
                      <p className="text-sm text-muted-foreground text-center py-4">No crew assigned yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })()}

          {activeTab === 'documents' && (() => {
            type DocStatus = 'present' | 'missing' | 'na'
            const docChecklist: Array<{ label: string; status: DocStatus }> = [
              { label: 'Site Survey Report', status: job.site_survey_id ? 'present' : 'missing' },
              { label: 'Permits', status: job.permit_numbers?.length > 0 ? 'present' : 'missing' },
              { label: 'Regulatory Notifications', status: job.regulatory_notifications_sent != null ? (job.regulatory_notifications_sent ? 'present' : 'missing') : 'missing' },
              {
                label: 'Air Monitoring Report',
                status: job.air_monitoring_required === false ? 'na' : (job.air_monitoring_results ? 'present' : 'missing'),
              },
              { label: 'Waste Disposal Manifests', status: job.disposal_manifest_numbers?.length > 0 ? 'present' : 'missing' },
              {
                label: 'Clearance Report',
                status: job.clearance_testing_required === false ? 'na' : (job.clearance_testing_passed ? 'present' : 'missing'),
              },
              { label: 'Customer Sign-off', status: job.customer_signed_off ? 'present' : 'missing' },
              {
                label: 'Completion Photos',
                status: job.completion_photos?.length > 0 ? 'present' : 'missing',
              },
            ]

            return (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5" />Required Documents</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {docChecklist.map(({ label, status }) => (
                      <div key={label} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          {status === 'present' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                           status === 'na' ? <MinusCircle className="h-4 w-4 text-muted-foreground" /> :
                           <Circle className="h-4 w-4 text-gray-300" />}
                          <span className="text-sm">{label}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {status === 'present' ? 'Complete' : status === 'na' ? 'N/A' : 'Missing'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                    {docChecklist.filter(d => d.status === 'present').length} of {docChecklist.filter(d => d.status !== 'na').length} required documents complete
                  </div>
                </CardContent>
              </Card>
            )
          })()}

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
