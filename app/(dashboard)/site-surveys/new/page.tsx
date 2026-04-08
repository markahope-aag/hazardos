'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Search, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleSiteSurveyForm } from '@/components/assessments/simple-site-survey-form'
import { createClient } from '@/lib/supabase/client'

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

export default function NewSiteSurveyPage() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer_id')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [contactSearch, setContactSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerId || '')
  const [initialData, setInitialData] = useState<Record<string, string> | null>(null)

  // Fetch all contacts
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers?limit=500')
        const data = await response.json()

        if (data.customers) {
          setCustomers(data.customers)
        } else if (Array.isArray(data)) {
          setCustomers(data)
        }
      } catch {
        // Failed to load customers - form still usable with manual entry
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // If a customer_id was passed via URL, pre-select and fetch details
  useEffect(() => {
    if (!customerId) {
      setInitialData({})
      return
    }

    const supabase = createClient()
    supabase
      .from('customers')
      .select('first_name, last_name, name, email, phone, address_line1, city, state, zip')
      .eq('id', customerId)
      .single()
      .then(({ data }) => {
        if (data) {
          const customerName = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.name || ''
          setInitialData({
            customer_name: customerName,
            customer_email: data.email || '',
            customer_phone: data.phone || '',
            site_address: data.address_line1 || '',
            site_city: data.city || '',
            site_state: data.state || '',
            site_zip: data.zip || '',
          })
        } else {
          setInitialData({})
        }
      })
  }, [customerId])

  const filteredCustomers = useMemo(() => {
    if (!contactSearch) return customers
    const q = contactSearch.toLowerCase()
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, contactSearch])

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id)
    const customer = customers.find(c => c.id === id)
    if (customer) {
      const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name || ''
      setInitialData({
        customer_name: customerName,
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        site_address: customer.address_line1 || '',
        site_city: customer.city || '',
        site_state: customer.state || '',
        site_zip: customer.zip || '',
      })
    }
  }

  const backHref = customerId ? `/crm/contacts/${customerId}` : '/site-surveys'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Site Survey</h1>
          <p className="text-gray-600">Create a new field site survey</p>
        </div>
      </div>

      {/* Contact lookup (only show if no customer_id was pre-selected via URL) */}
      {!customerId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Contacts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder={loadingCustomers ? 'Loading contacts...' : 'Search by name, company, or email...'}
                  className="pl-9"
                  disabled={loadingCustomers}
                />
              </div>
              <Select
                value={selectedCustomerId}
                onValueChange={handleSelectCustomer}
                disabled={loadingCustomers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCustomers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No contacts found</div>
                  ) : (
                    filteredCustomers.map(customer => {
                      const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name || 'Unnamed'
                      return (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center gap-2">
                            <span>{displayName}</span>
                            {customer.company_name && (
                              <span className="text-xs text-muted-foreground">
                                · {customer.company_name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Selected contact info card */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="font-medium">
                  {[selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') || selectedCustomer.name || 'Unnamed'}
                </div>
                {selectedCustomer.company_name && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-3 w-3" />{selectedCustomer.company_name}
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="text-muted-foreground">{selectedCustomer.email}</div>
                )}
                {selectedCustomer.address_line1 && (
                  <div className="text-muted-foreground">
                    {selectedCustomer.address_line1}
                    {selectedCustomer.city && `, ${selectedCustomer.city}`}
                    {selectedCustomer.state && ` ${selectedCustomer.state}`}
                    {selectedCustomer.zip && ` ${selectedCustomer.zip}`}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form -- render once initial data is resolved */}
      {initialData !== null && (
        <SimpleSiteSurveyForm initialData={initialData} />
      )}
    </div>
  )
}
