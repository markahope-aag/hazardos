'use client'

import { use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2, Users, Mail, Phone, MapPin, Globe, AlertCircle } from 'lucide-react'
import { useCompany } from '@/lib/hooks/use-companies'
import { useCustomers } from '@/lib/hooks/use-customers'

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = use(params)
  const { data: company, isLoading, error } = useCompany(id)

  // Fetch contacts linked to this company
  // We pass the company ID but the hook filters by org — we'll filter client-side for now
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
            <p className="text-gray-600">{error instanceof Error ? error.message : 'The company doesn\'t exist or has been deleted.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const address = [company.address_line1, company.address_line2].filter(Boolean).join(', ')
  const cityStateZip = [company.city, company.state, company.zip].filter(Boolean).join(', ')

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
              <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                {company.status}
              </Badge>
            </div>
            {company.industry && (
              <p className="text-muted-foreground ml-9">{company.industry}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Company Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {company.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{company.email}</p>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p>{company.phone}</p>
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
                {(address || cityStateZip) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      {address && <p>{address}</p>}
                      {cityStateZip && <p>{cityStateZip}</p>}
                    </div>
                  </div>
                )}
              </div>
              {company.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{company.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

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
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
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
        </div>
      </div>
    </div>
  )
}
