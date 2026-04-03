'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Edit, Mail, Phone, Building2, MapPin,
  MessageSquare, Briefcase, Target, ChevronDown, Trash2,
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
import { useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import type { Customer, CustomerStatus } from '@/types/database'

const CONTACT_ROLE_LABELS: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  billing: 'Billing',
  property_manager: 'Property Manager',
  site_contact: 'Site Contact',
  other: 'Other',
}

interface CustomerDetailProps {
  customer: Customer
}

export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'opportunities' | 'jobs'>('overview')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const updateStatusMutation = useUpdateCustomerStatus()

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

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'activity' as const, label: 'Activity' },
    { id: 'opportunities' as const, label: 'Opportunities' },
    { id: 'jobs' as const, label: 'Jobs' },
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
                {customer.preferred_contact_method && (
                  <div className="text-xs text-muted-foreground">
                    Prefers: <span className="capitalize">{customer.preferred_contact_method}</span>
                  </div>
                )}
              </div>

              {customer.address_line1 && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{customer.address_line1}</p>
                      {customer.address_line2 && <p>{customer.address_line2}</p>}
                      <p>{[customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}</p>
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
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
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
                        <p className="text-xs text-muted-foreground">{customer.next_followup_note}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attribution */}
              {(customer.lead_source || customer.utm_source || customer.referred_by_contact_id) && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Attribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {customer.lead_source && (
                        <div>
                          <p className="text-muted-foreground">Lead Source</p>
                          <p className="font-medium">{customer.lead_source}</p>
                          {customer.lead_source_detail && <p className="text-xs text-muted-foreground">{customer.lead_source_detail}</p>}
                        </div>
                      )}
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
              )}

              {/* Notes */}
              {customer.notes && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}

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

          {activeTab === 'jobs' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-5 w-5" />Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Jobs linked to this contact will appear here
                </p>
              </CardContent>
            </Card>
          )}
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
    </div>
  )
}
