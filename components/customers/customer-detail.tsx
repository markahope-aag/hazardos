'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, Edit, Mail, Phone, Building2, MapPin,
  MessageSquare, Briefcase, Target, ChevronDown, Trash2,
  PhoneCall, CalendarPlus, User, Shield, Plus, ArrowRight,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import CustomerStatusBadge from './customer-status-badge'
import EditCustomerModal from './edit-customer-modal'
import DeleteCustomerDialog from './delete-customer-dialog'
import CustomerSurveysList from './customer-surveys-list'
import CustomerActivityFeed from './customer-activity-feed'
import CustomerJobsList from './customer-jobs-list'
import { useUpdateCustomer, useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import { createClient } from '@/lib/supabase/client'
import { WorkflowProgress } from '@/components/workflow/workflow-progress'
import type { Customer, CustomerStatus } from '@/types/database'

const CONTACT_ROLE_LABELS: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  billing: 'Billing',
  property_manager: 'Property Manager',
  site_contact: 'Site Contact',
  other: 'Other',
}

const PREFERRED_METHOD_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  text: 'SMS / Text',
  mail: 'Mail',
}

interface CustomerWithJoins extends Customer {
  account_owner?: { id: string; first_name?: string; last_name?: string; full_name?: string } | null
}

interface CustomerDetailProps {
  customer: CustomerWithJoins
}

export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLogCallDialog, setShowLogCallDialog] = useState(false)
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'opportunities' | 'jobs'>('overview')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteValue, setNewNoteValue] = useState('')
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [callDuration, setCallDuration] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const updateStatusMutation = useUpdateCustomerStatus()
  const updateCustomerMutation = useUpdateCustomer()

  const { data: workflow } = useQuery({
    queryKey: ['customer-workflow', customer.id],
    queryFn: async () => {
      const supabase = createClient()

      const { data: surveys } = await supabase
        .from('site_surveys')
        .select('id')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const surveyId = surveys?.[0]?.id || null

      let estimateId: string | null = null
      if (surveyId) {
        const { data: estimates } = await supabase
          .from('estimates')
          .select('id')
          .eq('site_survey_id', surveyId)
          .order('created_at', { ascending: false })
          .limit(1)
        estimateId = estimates?.[0]?.id || null
      }

      let jobId: string | null = null
      if (estimateId) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('estimate_id', estimateId)
          .limit(1)
        jobId = jobs?.[0]?.id || null
      }

      return { surveyId, estimateId, jobId }
    },
    enabled: !!customer.id,
    staleTime: 60000,
  })

  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    if (newStatus === customer.status) return
    setIsUpdatingStatus(true)
    try {
      await updateStatusMutation.mutateAsync({ id: customer.id, status: newStatus })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNoteValue.trim()) return
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const newEntry = `[${timestamp}] ${newNoteValue.trim()}`
    const updatedNotes = customer.notes
      ? `${newEntry}\n\n${customer.notes}`
      : newEntry
    await updateCustomerMutation.mutateAsync({
      id: customer.id,
      updates: { notes: updatedNotes },
    })
    setNewNoteValue('')
    setAddingNote(false)
  }

  const handleLogCall = async () => {
    try {
      const res = await fetch('/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call',
          entity_type: 'customer',
          entity_id: customer.id,
          entity_name: displayName,
          call_direction: callDirection,
          call_duration: callDuration ? Number(callDuration) : undefined,
          content: callNotes,
        }),
      })
      if (!res.ok) throw new Error('Failed to log call')
      toast({ title: 'Call logged', description: `${callDirection === 'inbound' ? 'Inbound' : 'Outbound'} call recorded.` })
      setShowLogCallDialog(false)
      setCallDirection('outbound')
      setCallDuration('')
      setCallNotes('')
    } catch {
      toast({ title: 'Error', description: 'Failed to log call. Please try again.', variant: 'destructive' })
    }
  }

  const handleFollowUp = async () => {
    if (!followUpDate) return
    try {
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        updates: {
          next_followup_date: followUpDate,
          next_followup_note: followUpNote || null,
        },
      })
      toast({ title: 'Follow-up set', description: `Follow-up scheduled for ${new Date(followUpDate).toLocaleDateString()}.` })
      setShowFollowUpDialog(false)
      setFollowUpDate('')
      setFollowUpNote('')
    } catch {
      toast({ title: 'Error', description: 'Failed to set follow-up. Please try again.', variant: 'destructive' })
    }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', count: undefined as number | undefined },
    { id: 'activity' as const, label: 'Activity', count: undefined as number | undefined },
    { id: 'opportunities' as const, label: 'Opportunities', count: undefined as number | undefined },
    { id: 'jobs' as const, label: 'Jobs', count: (customer.total_jobs || 0) as number | undefined },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Contacts
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="mr-2 h-4 w-4" />Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdatingStatus}>
                Status <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)} disabled={opt.value === customer.status}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar — Contact Card */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Name & Title */}
              <div>
                <h1 className="text-xl font-bold">{displayName}</h1>
                {customer.title && <p className="text-sm text-muted-foreground">{customer.title}</p>}
                {customer.company_name && (
                  <Link href={customer.company_id ? `/crm/companies/${customer.company_id}` : '#'} className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3" />{customer.company_name}
                  </Link>
                )}
              </div>

              <Separator />

              {/* Contact Methods */}
              <div className="space-y-2 text-sm">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
                  </div>
                )}
                {customer.mobile_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.mobile_phone}`} className="hover:underline">{customer.mobile_phone}</a>
                    <span className="text-xs text-muted-foreground">mobile</span>
                  </div>
                )}
                {customer.office_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.office_phone}`} className="hover:underline">{customer.office_phone}</a>
                    <span className="text-xs text-muted-foreground">office</span>
                  </div>
                )}
              </div>

              {/* Preferred Contact Method */}
              {customer.preferred_contact_method && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Preferred Contact Method</p>
                  <p className="font-medium">{PREFERRED_METHOD_LABELS[customer.preferred_contact_method] || customer.preferred_contact_method}</p>
                </div>
              )}

              {/* Account Owner */}
              {customer.account_owner_id && (
                <div className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Account Owner</p>
                    <p className="font-medium">
                      {customer.account_owner
                        ? customer.account_owner.full_name || [customer.account_owner.first_name, customer.account_owner.last_name].filter(Boolean).join(' ')
                        : 'Assigned'}
                    </p>
                  </div>
                </div>
              )}

              {customer.address_line1 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p>{customer.address_line1}</p>
                      {customer.address_line2 && <p>{customer.address_line2}</p>}
                      <p>{[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}</p>
                      {customer.property_id && (
                        <Link
                          href={`/crm/properties/${customer.property_id}`}
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline"
                        >
                          View property history
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{customer.contact_type}</Badge>
                <CustomerStatusBadge status={customer.status} />
                {customer.contact_role && (
                  <Badge variant="secondary">{CONTACT_ROLE_LABELS[customer.contact_role] || customer.contact_role}</Badge>
                )}
                {customer.contact_status === 'do_not_contact' && (
                  <Badge variant="destructive">Do Not Contact</Badge>
                )}
              </div>

              {/* Opt-in Status */}
              <div className="flex gap-3 text-xs">
                <div className={`flex items-center gap-1 ${customer.opted_into_email ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <Mail className="h-3 w-3" />
                  {customer.opted_into_email ? 'Email opted in' : 'Email not opted in'}
                </div>
                <div className={`flex items-center gap-1 ${customer.opted_into_sms ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <MessageSquare className="h-3 w-3" />
                  {customer.opted_into_sms ? 'SMS opted in' : 'SMS not opted in'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => setShowLogCallDialog(true)}>
              <PhoneCall className="h-4 w-4" />
              <span className="text-xs">Log Call</span>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3" asChild>
              <a href={customer.email ? `mailto:${customer.email}` : '#'}>
                <Mail className="h-4 w-4" />
                <span className="text-xs">Send Email</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => setShowFollowUpDialog(true)}>
              <CalendarPlus className="h-4 w-4" />
              <span className="text-xs">Follow-up</span>
            </Button>
            {/* Workflow Next Step CTA */}
            {workflow?.jobId ? (
              <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3" asChild>
                <Link href={`/crm/jobs/${workflow.jobId}`}>
                  <Briefcase className="h-4 w-4" />
                  <span className="text-xs">View Job</span>
                </Link>
              </Button>
            ) : workflow?.estimateId ? (
              <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                <Link href={`/jobs/new?estimate_id=${workflow.estimateId}&customer_id=${customer.id}`}>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-xs">Schedule Job</span>
                </Link>
              </Button>
            ) : workflow?.surveyId ? (
              <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                <Link href={`/estimates/new?survey_id=${workflow.surveyId}`}>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-xs">Create Estimate</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50" asChild>
                <Link href={`/site-surveys/new?customer_id=${customer.id}`}>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-xs">Schedule Survey</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Right Main Content — Tabbed */}
        <div className="space-y-4">
          {/* Tab Bar */}
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}{tab.count !== undefined && tab.count > 0 ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Workflow Progress */}
              <WorkflowProgress
                customerId={customer.id}
                customerName={displayName}
                surveyId={workflow?.surveyId}
                estimateId={workflow?.estimateId}
                jobId={workflow?.jobId}
              />

              {/* Key Dates */}
              <Card>
                <CardHeader><CardTitle className="text-base">Key Dates</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">First Touch</p>
                      <p className="font-medium">{customer.first_touch_date ? new Date(customer.first_touch_date).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Contacted</p>
                      <p className="font-medium">{customer.last_contacted_date ? new Date(customer.last_contacted_date).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Follow-up</p>
                      <p className={`font-medium ${customer.next_followup_date && new Date(customer.next_followup_date) < new Date() ? 'text-destructive' : ''}`}>
                        {customer.next_followup_date ? new Date(customer.next_followup_date).toLocaleDateString() : '—'}
                      </p>
                      {customer.next_followup_note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{customer.next_followup_note}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Source / Attribution */}
              <Card>
                <CardHeader><CardTitle className="text-base">Lead Source</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{customer.lead_source || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Source Detail</p>
                      <p className="font-medium">{customer.lead_source_detail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Referred By</p>
                      {customer.referred_by_contact_id ? (
                        <Link href={`/crm/contacts/${customer.referred_by_contact_id}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <User className="h-3 w-3" />View Referrer
                        </Link>
                      ) : (
                        <p className="font-medium">—</p>
                      )}
                    </div>
                    {customer.utm_source && (
                      <div>
                        <p className="text-muted-foreground">UTM Source</p>
                        <p className="font-medium">{customer.utm_source}</p>
                      </div>
                    )}
                    {customer.utm_medium && (
                      <div>
                        <p className="text-muted-foreground">UTM Medium</p>
                        <p className="font-medium">{customer.utm_medium}</p>
                      </div>
                    )}
                    {customer.utm_campaign && (
                      <div>
                        <p className="text-muted-foreground">UTM Campaign</p>
                        <p className="font-medium">{customer.utm_campaign}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Insurance */}
              {customer.insurance_carrier && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4" />Insurance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Insurance Carrier</p>
                        <p className="font-medium">{customer.insurance_carrier}</p>
                      </div>
                      {customer.insurance_policy_number && (
                        <div>
                          <p className="text-muted-foreground">Policy Number</p>
                          <p className="font-medium">{customer.insurance_policy_number}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      For reference only — customers file their own reimbursement claims.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Notes — timestamped feed */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Notes</CardTitle>
                    {!addingNote && (
                      <Button variant="ghost" size="sm" onClick={() => setAddingNote(true)}>
                        <Plus className="h-3 w-3 mr-1" />Add Note
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {addingNote && (
                    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                      <Textarea
                        value={newNoteValue}
                        onChange={(e) => setNewNoteValue(e.target.value)}
                        rows={3}
                        placeholder="Write a note..."
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setAddingNote(false); setNewNoteValue('') }}>Cancel</Button>
                        <Button size="sm" onClick={handleAddNote} disabled={updateCustomerMutation.isPending || !newNoteValue.trim()}>
                          {updateCustomerMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {customer.notes ? (
                    <NotesFeed notes={customer.notes} createdAt={customer.created_at} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes yet. Click Add Note to get started.</p>
                  )}
                </CardContent>
              </Card>

              {/* Surveys */}
              <CustomerSurveysList customerId={customer.id} />
            </div>
          )}

          {activeTab === 'activity' && (
            <CustomerActivityFeed customer={customer} />
          )}

          {activeTab === 'opportunities' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-5 w-5" />Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Opportunities linked to this contact will appear here
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'jobs' && <CustomerJobsList customer={customer} />}
        </div>
      </div>

      {/* Modals */}
      <EditCustomerModal customer={customer} open={showEditModal} onClose={() => setShowEditModal(false)} />
      <DeleteCustomerDialog
        customer={customer}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={() => { setShowDeleteDialog(false); router.push('/crm/contacts') }}
      />

      {/* Log Call Dialog */}
      <Dialog open={showLogCallDialog} onOpenChange={setShowLogCallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="callDirection"
                    checked={callDirection === 'outbound'}
                    onChange={() => setCallDirection('outbound')}
                    className="accent-primary"
                  />
                  Outbound
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="callDirection"
                    checked={callDirection === 'inbound'}
                    onChange={() => setCallDirection('inbound')}
                    className="accent-primary"
                  />
                  Inbound
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="callDuration">Duration (minutes)</Label>
              <Input
                id="callDuration"
                type="number"
                min="0"
                placeholder="e.g. 15"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="callNotes">Notes</Label>
              <Textarea
                id="callNotes"
                rows={3}
                placeholder="What was discussed..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogCallDialog(false)}>Cancel</Button>
            <Button onClick={handleLogCall}>Log Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpNote">Note (optional)</Label>
              <Input
                id="followUpNote"
                placeholder="Reason for follow-up..."
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancel</Button>
            <Button onClick={handleFollowUp} disabled={!followUpDate}>Set Follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Notes Feed ── */

const TIMESTAMP_PATTERN = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] /

interface NoteEntry {
  timestamp: string | null
  text: string
}

function parseNotes(raw: string, createdAt: string): NoteEntry[] {
  const blocks = raw.split('\n\n').filter((b) => b.trim())
  const entries: NoteEntry[] = []

  for (const block of blocks) {
    const match = block.match(TIMESTAMP_PATTERN)
    if (match) {
      entries.push({ timestamp: match[1], text: block.replace(TIMESTAMP_PATTERN, '') })
    } else {
      entries.push({ timestamp: null, text: block })
    }
  }

  // If there are no entries at all, treat the whole thing as a legacy note
  if (entries.length === 0 && raw.trim()) {
    entries.push({ timestamp: null, text: raw.trim() })
  }

  // Tag legacy entries with created_at date
  return entries.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp ?? new Date(createdAt).toISOString().slice(0, 16).replace('T', ' '),
  }))
}

function NotesFeed({ notes, createdAt }: { notes: string; createdAt: string }) {
  const entries = parseNotes(notes, createdAt)

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes yet.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="border rounded-md p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">
            {entry.timestamp ? new Date(entry.timestamp.replace(' ', 'T')).toLocaleString() : 'Original Note'}
          </p>
          <p className="whitespace-pre-wrap">{entry.text}</p>
        </div>
      ))}
    </div>
  )
}
