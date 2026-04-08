'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SimpleSiteSurveyForm } from '@/components/assessments/simple-site-survey-form'
import { createClient } from '@/lib/supabase/client'

export default function NewSiteSurveyPage() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer_id')
  const [initialData, setInitialData] = useState<Record<string, string> | null>(
    customerId ? null : {}
  )

  useEffect(() => {
    if (!customerId) return

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={customerId ? `/crm/contacts/${customerId}` : '/site-surveys'}>
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

      {/* Form — render once initial data is resolved */}
      {initialData !== null && (
        <SimpleSiteSurveyForm initialData={initialData} />
      )}
    </div>
  )
}
