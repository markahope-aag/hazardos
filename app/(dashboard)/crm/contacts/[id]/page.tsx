'use client'

import { use } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import CustomerDetail from '@/components/customers/customer-detail'
import { useCustomer } from '@/lib/hooks/use-customers'

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = use(params)
  const { data: customer, isLoading, error } = useCustomer(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-6 w-40 mb-4" /><Skeleton className="h-4 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-6 w-40 mb-4" /><Skeleton className="h-4 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading Contact</h2>
            <p className="text-gray-600">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Contact Not Found</h2>
            <p className="text-gray-600">The contact you're looking for doesn't exist or has been deleted.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <CustomerDetail customer={customer} />
}
