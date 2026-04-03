'use client'

import { use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Building2, Users, Mail, Phone, MapPin, Globe, AlertCircle, DollarSign, Briefcase, TrendingUp } from 'lucide-react'
import { useCompany } from '@/lib/hooks/use-companies'
import { useCustomers } from '@/lib/hooks/use-customers'
import { formatCurrency } from '@/lib/utils'

const COMPANY_TYPE_LABELS: Record<string, string> = {
  residential_property_mgr: 'Residential Property Manager',
  commercial_property_mgr: 'Commercial Property Manager',
  general_contractor: 'General Contractor',
  industrial: 'Industrial',
  hoa: 'HOA',
  government: 'Government',
  direct_homeowner: 'Direct Homeowner',
  other: 'Other',
}

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = use(params)
  const { data: company, isLoading, error } = useCompany(id)
  const { data: allContacts = [] } = useCustomers({ pageSize: 100 })
  const contacts = allContacts.filter((c: { company_id: string | null }) => c.company_id === id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="p-6"><Skeleton className="h-6 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">{error ? 'Error Loading Company' : 'Company Not Found'}</h2>
          </CardContent>
        </Card>
      </div>
    )
  }

  const billingAddress = [company.billing_address_line1, company.billing_address_line2].filter(Boolean).join(', ')
  const billingCityStateZip = [company.billing_city, company.billing_state, company.billing_zip].filter(Boolean).join(', ')
  const serviceAddress = [company.service_address_line1, company.service_address_line2].filter(Boolean).join(', ')
  const serviceCityStateZip = [company.service_city, company.service_state, company.service_zip].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/companies"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <Badge variant={company.account_status === 'active' ? 'default' : 'secondary'}>
                {company.account_status || company.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 ml-9 text-sm text-muted-foreground">
              {company.company_type && <span>{COMPANY_TYPE_LABELS[company.company_type] || company.company_type}</span>}
              {company.industry && <><span>·</span><span>{company.industry}</span></>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(company.primary_email || company.email) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{company.primary_email || company.email}</p>
                    </div>
                  </div>
                )}
                {(company.primary_phone || company.phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p>{company.primary_phone || company.phone}</p>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <p>{company.website}</p>
                    </div>
                  </div>
                )}
                {company.preferred_contact_method && (
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred Contact</p>
                    <p className="capitalize">{company.preferred_contact_method}</p>
                  </div>
                )}
              </div>

              {(billingAddress || billingCityStateZip) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Billing Address</p>
                      {billingAddress && <p>{billingAddress}</p>}
                      {billingCityStateZip && <p>{billingCityStateZip}</p>}
                    </div>
                  </div>
                </>
              )}

              {(serviceAddress || serviceCityStateZip) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Service Address</p>
                    {serviceAddress && <p>{serviceAddress}</p>}
                    {serviceCityStateZip && <p>{serviceCityStateZip}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketing Attribution */}
          {(company.lead_source || company.utm_source || company.referred_by_company_id) && (
            <Card>
              <CardHeader><CardTitle>Marketing Attribution</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {company.lead_source && (
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{company.lead_source}</p>
                      {company.lead_source_detail && <p className="text-muted-foreground">{company.lead_source_detail}</p>}
                    </div>
                  )}
                  {company.first_touch_date && (
                    <div>
                      <p className="text-muted-foreground">First Touch</p>
                      <p className="font-medium">{new Date(company.first_touch_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {company.utm_source && (
                    <div>
                      <p className="text-muted-foreground">UTM Source</p>
                      <p className="font-medium">{company.utm_source}</p>
                    </div>
                  )}
                  {company.utm_medium && (
                    <div>
                      <p className="text-muted-foreground">UTM Medium</p>
                      <p className="font-medium">{company.utm_medium}</p>
                    </div>
                  )}
                  {company.utm_campaign && (
                    <div>
                      <p className="text-muted-foreground">UTM Campaign</p>
                      <p className="font-medium">{company.utm_campaign}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Associated Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacts ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No contacts linked to this company</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((contact: { id: string; name: string; email: string | null; phone: string | null; status: string }) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Link href={`/crm/contacts/${contact.id}`} className="font-medium text-primary hover:underline">
                          {contact.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {[contact.email, contact.phone].filter(Boolean).join(' | ')}
                        </div>
                      </div>
                      <Badge variant="outline">{contact.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Financial</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lifetime Value</span>
                <span className="font-bold">{formatCurrency(company.lifetime_value || 0, false)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jobs Completed</span>
                <span className="font-medium">{company.total_jobs_completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Job Value</span>
                <span className="font-medium">{formatCurrency(company.average_job_value || 0, false)}</span>
              </div>
              {company.payment_terms && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Terms</span>
                    <span className="font-medium">{company.payment_terms}</span>
                  </div>
                </>
              )}
              {company.quickbooks_customer_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">QuickBooks ID</span>
                  <span className="text-xs font-mono">{company.quickbooks_customer_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {company.customer_since && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer Since</span>
                  <span>{new Date(company.customer_since).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(company.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(company.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {company.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
