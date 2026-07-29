'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Eye, Printer, AlertCircle } from 'lucide-react'
import {
  CustomerDocument,
  type CustomerDocumentEstimate,
  type CustomerDocumentProposal,
  type CustomerDocumentCustomer,
} from '@/components/proposals/customer-document'

interface CustomerViewResponse {
  estimate: CustomerDocumentEstimate
  customer: CustomerDocumentCustomer | null
  organizationName: string | null
  proposal: CustomerDocumentProposal | null
  hasProposal: boolean
}

/**
 * "Show me what the customer sees."
 *
 * Renders the exact component the proposal portal renders, so what's on
 * screen here is what's on their screen — which is the point. When the office
 * takes a call about "line item three", this is the page to open.
 */
export default function EstimatePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { data, isLoading, error } = useQuery({
    queryKey: ['estimate-customer-view', id],
    queryFn: async (): Promise<CustomerViewResponse> => {
      const res = await fetch(`/api/estimates/${id}/customer-view`)
      if (!res.ok) throw new Error('Could not load the customer view')
      return res.json()
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>Could not load the customer view for this estimate.</p>
        </div>
        <Button variant="outline" asChild className="mt-4">
          <Link href={`/estimates/${id}`}>Back to the estimate</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="-m-6">
      {/* Staff-only chrome. Deliberately outside CustomerDocument so it can
          never appear on the real portal page. */}
      <div className="sticky top-0 z-20 bg-slate-900 text-slate-100 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-100 hover:text-slate-100 hover:bg-slate-800 shrink-0"
              aria-label="Back to the estimate"
            >
              <Link href={`/estimates/${id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0" />
                Customer view
              </p>
              <p className="text-xs text-slate-400 truncate">
                {data.hasProposal
                  ? 'Exactly what the customer sees on their proposal link.'
                  : 'No proposal sent yet — this is what they would see.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="bg-transparent text-slate-100 border-slate-600 hover:bg-slate-800 hover:text-slate-100 shrink-0"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <CustomerDocument
        estimate={data.estimate}
        proposal={data.proposal ?? {}}
        customer={data.customer}
        organizationName={data.organizationName}
      />
    </div>
  )
}
