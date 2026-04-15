'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MobileSurveyWizard from '@/components/surveys/mobile/mobile-survey-wizard'
import { CustomerCombobox } from '@/components/customers/customer-combobox'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

interface Customer {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
}

function NewSiteSurveyContent() {
  const searchParams = useSearchParams()
  const customerIdFromUrl = searchParams.get('customer_id')
  const { organization } = useMultiTenantAuth()

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerIdFromUrl || '')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // If we got a customer_id via URL, fetch the preview card data for the summary.
  // The wizard itself reads customerId as a prop; this fetch is only to render
  // the confirmation card above the wizard on desktop.
  useEffect(() => {
    if (!customerIdFromUrl || selectedCustomer) return
    let cancelled = false
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, name, company_name, email, phone, address_line1, city, state, zip')
        .eq('id', customerIdFromUrl)
        .single()
      if (!cancelled && data) {
        setSelectedCustomer(data as Customer)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [customerIdFromUrl, selectedCustomer])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSelectedCustomerId(customer.id)
  }

  const backHref = customerIdFromUrl ? `/crm/contacts/${customerIdFromUrl}` : '/site-surveys'

  // Before a customer is chosen, show the picker only. Once a customer is
  // selected, swap in the full survey wizard — identical in content to the
  // mobile /site-surveys/mobile experience, so desktop QA exercises the same
  // form the field team uses.
  if (!selectedCustomerId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Site Survey</h1>
            <p className="text-gray-600">Start by picking a contact, then fill in the survey</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-combobox">Contact</Label>
              <CustomerCombobox
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                onCustomerSelect={handleCustomerSelect}
                placeholder="Search by name, company, or email..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Customer picked — render the wizard. Keyed on customerId so that if the
  // user somehow changes contacts we get a clean remount and fresh draft.
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Site Survey</h1>
          </div>
        </div>
        {!customerIdFromUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCustomerId('')
              setSelectedCustomer(null)
            }}
          >
            Change contact
          </Button>
        )}
      </div>

      {selectedCustomer && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5 mb-4">
          <div className="font-medium">
            {[selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') ||
              selectedCustomer.name ||
              'Unnamed'}
          </div>
          {selectedCustomer.company_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{selectedCustomer.company_name}</span>
            </div>
          )}
          {selectedCustomer.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{selectedCustomer.email}</span>
            </div>
          )}
          {selectedCustomer.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{selectedCustomer.phone}</span>
            </div>
          )}
          {selectedCustomer.address_line1 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                {selectedCustomer.address_line1}
                {selectedCustomer.city && `, ${selectedCustomer.city}`}
                {selectedCustomer.state && ` ${selectedCustomer.state}`}
                {selectedCustomer.zip && ` ${selectedCustomer.zip}`}
              </span>
            </div>
          )}
        </div>
      )}

      <MobileSurveyWizard
        key={selectedCustomerId}
        customerId={selectedCustomerId}
        organizationId={organization?.id}
        embedded
      />
    </div>
  )
}

export default function NewSiteSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewSiteSurveyContent />
    </Suspense>
  )
}
