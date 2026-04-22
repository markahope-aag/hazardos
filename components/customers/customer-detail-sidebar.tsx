'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarPlus,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  User,
} from 'lucide-react'
import CustomerStatusBadge from './customer-status-badge'
import { EmailComposeDialog } from './email-compose-dialog'
import { useToast } from '@/components/ui/use-toast'
import type { Customer } from '@/types/database'

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
  account_owner?: {
    id: string
    first_name?: string
    last_name?: string
    full_name?: string
  } | null
}

interface Props {
  customer: CustomerWithJoins
  displayName: string
  workflow?: { surveyId: string | null; estimateId: string | null; jobId: string | null } | null
  onLogCallClick: () => void
  onFollowUpClick: () => void
}

/**
 * Left column of the contact detail page: contact card (name, phones,
 * address, preferred-contact badges) and a 2x2 grid of quick actions.
 * The fourth quick action is a "next step" CTA that surfaces whichever
 * stage the customer's workflow is sitting at — survey, estimate, or
 * job — so the common rep move is one tap away.
 */
export function CustomerDetailSidebar({
  customer,
  displayName,
  workflow,
  onLogCallClick,
  onFollowUpClick,
}: Props) {
  const { toast } = useToast()
  const [composeOpen, setComposeOpen] = useState(false)

  const openCompose = () => {
    if (!customer.email) {
      toast({
        title: 'No email on file',
        description: 'Add an email address to this contact before sending.',
        variant: 'destructive',
      })
      return
    }
    setComposeOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            {customer.title && <p className="text-sm text-muted-foreground">{customer.title}</p>}
            {customer.company_name && (
              <Link
                href={customer.company_id ? `/crm/companies/${customer.company_id}` : '#'}
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Building2 className="h-3 w-3" />
                {customer.company_name}
              </Link>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              </div>
            )}
            {customer.mobile_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${customer.mobile_phone}`} className="hover:underline">
                  {customer.mobile_phone}
                </a>
                <span className="text-xs text-muted-foreground">mobile</span>
              </div>
            )}
            {customer.office_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${customer.office_phone}`} className="hover:underline">
                  {customer.office_phone}
                </a>
                <span className="text-xs text-muted-foreground">office</span>
              </div>
            )}
          </div>

          {customer.preferred_contact_method && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Preferred Contact Method</p>
              <p className="font-medium">
                {PREFERRED_METHOD_LABELS[customer.preferred_contact_method] ||
                  customer.preferred_contact_method}
              </p>
            </div>
          )}

          {customer.account_owner_id && (
            <div className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Account Owner</p>
                <p className="font-medium">
                  {customer.account_owner
                    ? customer.account_owner.full_name ||
                      [customer.account_owner.first_name, customer.account_owner.last_name]
                        .filter(Boolean)
                        .join(' ')
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

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {customer.contact_type}
            </Badge>
            <CustomerStatusBadge status={customer.status} />
            {customer.contact_role && (
              <Badge variant="secondary">
                {CONTACT_ROLE_LABELS[customer.contact_role] || customer.contact_role}
              </Badge>
            )}
            {customer.contact_status === 'do_not_contact' && (
              <Badge variant="destructive">Do Not Contact</Badge>
            )}
          </div>

          <div className="flex gap-3 text-xs">
            <div
              className={`flex items-center gap-1 ${customer.opted_into_email ? 'text-green-600' : 'text-muted-foreground'}`}
            >
              <Mail className="h-3 w-3" />
              {customer.opted_into_email ? 'Email opted in' : 'Email not opted in'}
            </div>
            <div
              className={`flex items-center gap-1 ${customer.opted_into_sms ? 'text-green-600' : 'text-muted-foreground'}`}
            >
              <MessageSquare className="h-3 w-3" />
              {customer.opted_into_sms ? 'SMS opted in' : 'SMS not opted in'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={onLogCallClick}
        >
          <PhoneCall className="h-4 w-4" />
          <span className="text-xs">Log Call</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={openCompose}
          disabled={!customer.email}
          title={customer.email ? `Email ${customer.email}` : 'No email on file'}
        >
          <Mail className="h-4 w-4" />
          <span className="text-xs">Send Email</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-3"
          onClick={onFollowUpClick}
        >
          <CalendarPlus className="h-4 w-4" />
          <span className="text-xs">Follow-up</span>
        </Button>
        {/* Workflow-aware next-step CTA. Jumps to whichever stage the
            customer is currently parked at. */}
        {workflow?.jobId ? (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3"
            asChild
          >
            <Link href={`/crm/jobs/${workflow.jobId}`}>
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">View Job</span>
            </Link>
          </Button>
        ) : workflow?.estimateId ? (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50"
            asChild
          >
            <Link href={`/jobs/new?estimate_id=${workflow.estimateId}&customer_id=${customer.id}`}>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs">Schedule Job</span>
            </Link>
          </Button>
        ) : workflow?.surveyId ? (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50"
            asChild
          >
            <Link href={`/estimates/new?survey_id=${workflow.surveyId}`}>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs">Create Estimate</span>
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 text-blue-700 hover:bg-blue-50"
            asChild
          >
            <Link href={`/site-surveys/new?customer_id=${customer.id}`}>
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs">Schedule Survey</span>
            </Link>
          </Button>
        )}
      </div>

      <EmailComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        contactId={customer.id}
        contactName={displayName}
        contactEmail={customer.email}
      />
    </div>
  )
}
