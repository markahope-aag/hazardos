'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Building2, Users, Mail, Phone, MapPin, Globe, AlertCircle,
  DollarSign, Target, ExternalLink, Edit, User, Star, Briefcase,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCompany, useUpdateCompany } from '@/lib/hooks/use-companies'
import { useCustomers } from '@/lib/hooks/use-customers'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import EntityActivityFeed from '@/components/activity/entity-activity-feed'
import CompanyJobsList from '@/components/companies/company-jobs-list'

const TYPE_LABELS: Record<string, string> = {
  residential_property_mgr: 'Residential Property Manager',
  commercial_property_mgr: 'Commercial Property Manager',
  general_contractor: 'General Contractor',
  industrial: 'Industrial',
  hoa: 'HOA',
  government: 'Government',
  direct_homeowner: 'Direct Homeowner',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  churned: 'bg-red-100 text-red-700',
}

const PREFERRED_METHOD_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  text: 'SMS / Text',
  mail: 'Mail',
}

const ROLE_LABELS: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  billing: 'Billing',
  property_manager: 'Property Manager',
  site_contact: 'Site Contact',
  other: 'Other',
}

interface Props { params: Promise<{ id: string }> }

export default function CompanyDetailPage({ params }: Props) {
  const { id } = use(params)
  const { data: company, isLoading, error } = useCompany(id)
  const { data: allContacts = [] } = useCustomers({ pageSize: 100 })
  const contacts = allContacts.filter((c: { company_id: string | null }) => c.company_id === id)

  // "Open" = work the crew still has in front of them. Separate from
  // company.total_jobs_completed (kept in sync by DB trigger) so the
  // two counts tell you current workload vs. historical delivery.
  const OPEN_JOB_STATUSES = ['scheduled', 'in_progress', 'on_hold']
  const { data: openJobCount = 0 } = useQuery({
    queryKey: ['company-open-jobs', id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient()
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id)
        .in('status', OPEN_JOB_STATUSES)
      return count ?? 0
    },
  })

  // Resolve the primary contact in its own query — the FK was just
  // added, older rows have it null, and we want to show the full name
  // + role without re-fetching the whole customers list.
  const primaryContactId = company?.primary_contact_id ?? null
  const { data: primaryContact = null } = useQuery({
    queryKey: ['company-primary-contact', primaryContactId],
    enabled: !!primaryContactId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!primaryContactId) return null
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('id, name, first_name, last_name, title, email, mobile_phone, office_phone, phone, contact_role')
        .eq('id', primaryContactId)
        .single()
      return data
    },
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'opportunities' | 'jobs' | 'activity'>('overview')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const updateCompanyMutation = useUpdateCompany()

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card></div>
  }

  if (error || !company) {
    return (
      <div className="py-6"><Card><CardContent className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold mb-2">{error ? 'Error Loading Company' : 'Company Not Found'}</h2>
      </CardContent></Card></div>
    )
  }

  const billingAddr = [company.billing_address_line1, company.billing_address_line2].filter(Boolean).join(', ')
  const billingCSZ = [company.billing_city, company.billing_state, company.billing_zip].filter(Boolean).join(', ')
  const serviceAddr = [company.service_address_line1, company.service_address_line2].filter(Boolean).join(', ')
  const serviceCSZ = [company.service_city, company.service_state, company.service_zip].filter(Boolean).join(', ')
  const displayStatus = company.account_status || company.status
  const statusColor = STATUS_COLORS[displayStatus] || ''

  const handleSaveNotes = async () => {
    await updateCompanyMutation.mutateAsync({ id: company.id, updates: { notes: notesValue } })
    setEditingNotes(false)
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'contacts' as const, label: `Contacts (${contacts.length})` },
    { id: 'opportunities' as const, label: 'Opportunities' },
    { id: 'jobs' as const, label: 'Jobs' },
    { id: 'activity' as const, label: 'Activity' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/companies"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              {company.name}
            </h1>
            {company.industry && (
              <p className="text-sm text-muted-foreground ml-8">{company.industry}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/crm/companies/${company.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/crm/opportunities/new?company=${company.name}`}>
              <Target className="h-4 w-4 mr-2" />New Opportunity
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Status + Type */}
              <div className="flex flex-wrap gap-2">
                <Badge className={`border-0 ${statusColor}`}>{displayStatus}</Badge>
                {company.company_type && (
                  <Badge variant="outline">{TYPE_LABELS[company.company_type] || company.company_type}</Badge>
                )}
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                {(company.primary_email || company.email) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${company.primary_email || company.email}`} className="hover:underline">{company.primary_email || company.email}</a>
                  </div>
                )}
                {(company.primary_phone || company.phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${company.primary_phone || company.phone}`} className="hover:underline">{company.primary_phone || company.phone}</a>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                      {company.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Billing Address */}
              {(billingAddr || billingCSZ) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Billing Address</p>
                      {billingAddr && <p>{billingAddr}</p>}
                      {billingCSZ && <p>{billingCSZ}</p>}
                    </div>
                  </div>
                </>
              )}
              {(serviceAddr || serviceCSZ) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Service Address</p>
                    {serviceAddr && <p>{serviceAddr}</p>}
                    {serviceCSZ && <p>{serviceCSZ}</p>}
                  </div>
                </div>
              )}

              <Separator />

              {/* Relationship Details */}
              <div className="space-y-2 text-sm">
                {company.account_owner_id && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Account Owner</p>
                      <p className="font-medium">Assigned</p>
                    </div>
                  </div>
                )}
                {company.customer_since && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer Since</span>
                    <span>{new Date(company.customer_since).toLocaleDateString()}</span>
                  </div>
                )}
                {company.preferred_contact_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Contact</span>
                    <span>{PREFERRED_METHOD_LABELS[company.preferred_contact_method] || company.preferred_contact_method}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact — the person we default to when reaching
              out. Set in Edit; rendered here so it's one glance away. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                Primary Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {primaryContact ? (
                <div className="space-y-2">
                  <div>
                    <Link
                      href={`/crm/contacts/${primaryContact.id}`}
                      className="font-medium hover:underline"
                    >
                      {[primaryContact.first_name, primaryContact.last_name].filter(Boolean).join(' ') ||
                        primaryContact.name ||
                        'Unnamed contact'}
                    </Link>
                    {primaryContact.title && (
                      <p className="text-xs text-muted-foreground">{primaryContact.title}</p>
                    )}
                    {primaryContact.contact_role && (
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[primaryContact.contact_role] || primaryContact.contact_role}
                      </p>
                    )}
                  </div>
                  {primaryContact.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${primaryContact.email}`} className="hover:underline truncate">
                        {primaryContact.email}
                      </a>
                    </div>
                  )}
                  {(primaryContact.mobile_phone || primaryContact.office_phone || primaryContact.phone) && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`tel:${primaryContact.mobile_phone || primaryContact.office_phone || primaryContact.phone}`}
                        className="hover:underline"
                      >
                        {primaryContact.mobile_phone || primaryContact.office_phone || primaryContact.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No primary contact set.{' '}
                  <Link
                    href={`/crm/companies/${company.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Choose one
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workload — separate from the historical financial summary
              because "how much are we on the hook for right now" is a
              different question than "how much have we delivered." */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open</span>
                <span className="font-medium">{openJobCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{company.total_jobs_completed || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Financial</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifetime Value</span>
                <span className="font-bold text-base">{formatCurrency(company.lifetime_value || 0, false)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Job Value</span>
                <span className="font-medium">{formatCurrency(company.average_job_value || 0, false)}</span>
              </div>
              {company.payment_terms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Terms</span>
                  <span>{company.payment_terms}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
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
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Dates */}
              <Card>
                <CardHeader><CardTitle className="text-base">Key Dates</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">First Touch</p>
                      <p className="font-medium">{company.first_touch_date ? new Date(company.first_touch_date).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Activity</p>
                      <p className="font-medium">{company.last_touch_date ? new Date(company.last_touch_date).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(company.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Source */}
              <Card>
                <CardHeader><CardTitle className="text-base">Lead Source</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{company.lead_source || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Source Detail</p>
                      <p className="font-medium">{company.lead_source_detail || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Referred By</p>
                      {company.referred_by_company_id ? (
                        <Link href={`/crm/companies/${company.referred_by_company_id}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <Building2 className="h-3 w-3" />View Referrer
                        </Link>
                      ) : company.referred_by_contact_id ? (
                        <Link href={`/crm/contacts/${company.referred_by_contact_id}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <User className="h-3 w-3" />View Referrer
                        </Link>
                      ) : (
                        <p className="font-medium">—</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Details */}
              <Card>
                <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{company.payment_terms || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">QuickBooks Customer ID</p>
                      <p className="font-medium">{company.quickbooks_customer_id ? <span className="font-mono text-xs">{company.quickbooks_customer_id}</span> : '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes — inline editable */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Notes</CardTitle>
                    {!editingNotes && (
                      <Button variant="ghost" size="sm" onClick={() => { setNotesValue(company.notes || ''); setEditingNotes(true) }}>
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        rows={4}
                        placeholder="Add notes about this company..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveNotes} disabled={updateCompanyMutation.isPending}>
                          {updateCompanyMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{company.notes || <span className="text-muted-foreground">No notes yet. Click Edit to add notes.</span>}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" />Contacts</CardTitle>
                  <Button size="sm" asChild>
                    <Link href={`/crm/contacts?newContact=true&company=${encodeURIComponent(company.name)}`}>Add Contact</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No contacts linked to this company yet</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact: { id: string; first_name: string | null; last_name: string | null; name: string; title: string | null; email: string | null; mobile_phone: string | null; office_phone: string | null; phone: string | null; contact_role: string | null; status: string; is_primary_contact: boolean }) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Link href={`/crm/contacts/${contact.id}`} className="font-medium text-primary hover:underline">
                              {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name}
                            </Link>
                            {contact.is_primary_contact && <Badge variant="default" className="text-xs">Primary</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-3">
                            {contact.title && <span>{contact.title}</span>}
                            {contact.email && <span>{contact.email}</span>}
                            {(contact.mobile_phone || contact.office_phone || contact.phone) && (
                              <span>{contact.mobile_phone || contact.office_phone || contact.phone}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contact.contact_role && (
                            <Badge variant="outline" className="text-xs">{ROLE_LABELS[contact.contact_role] || contact.contact_role}</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">{contact.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5" />Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">Opportunities linked to this company will appear here</p>
              </CardContent>
            </Card>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && <CompanyJobsList companyId={company.id} />}

          {/* Activity Tab */}
          {activeTab === 'activity' && <EntityActivityFeed companyId={company.id} />}
        </div>
      </div>
    </div>
  )
}
