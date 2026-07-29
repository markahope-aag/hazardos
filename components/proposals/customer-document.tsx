'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Building2, MapPin, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { EstimateLineItem, LineItemType } from '@/types/estimates'

/**
 * The document the customer actually sees.
 *
 * Extracted from the proposal portal so the office can preview it from
 * inside the app without a second implementation. That matters more than it
 * looks: the whole point of the preview is answering "what is the customer
 * looking at when they ring up about line item three?", and a preview that
 * drifts from the real page answers that question wrongly. Both render this.
 *
 * Presentation only — no data fetching, no signing. The portal owns the
 * signature flow and wraps this; the preview wraps it in a banner.
 */

const LINE_ITEM_TYPE_LABELS: Record<LineItemType, string> = {
  labor: 'Labor',
  equipment: 'Equipment',
  material: 'Materials',
  disposal: 'Disposal',
  travel: 'Travel',
  permit: 'Permits',
  testing: 'Testing',
  other: 'Other',
}

/** Only the fields the customer-facing document reads. */
export interface CustomerDocumentEstimate {
  scope_of_work?: string | null
  estimated_duration_days?: number | null
  subtotal: number
  markup_percent: number
  markup_amount: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  tax_amount: number
  total: number
  line_items?: EstimateLineItem[] | null
  site_survey?: {
    site_address?: string | null
    site_city?: string | null
    site_state?: string | null
    site_zip?: string | null
  } | null
}

export interface CustomerDocumentProposal {
  proposal_number?: string | null
  status?: string | null
  cover_letter?: string | null
  inclusions?: string[] | null
  exclusions?: string[] | null
  payment_terms?: string | null
  terms_and_conditions?: string | null
  valid_until?: string | null
  signed_at?: string | null
}

export interface CustomerDocumentCustomer {
  company_name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

interface CustomerDocumentProps {
  estimate: CustomerDocumentEstimate
  proposal: CustomerDocumentProposal
  customer?: CustomerDocumentCustomer | null
  organizationName?: string | null
  /** Set once the customer has signed — swaps the badge and adds the receipt. */
  signed?: boolean
  /** Rendered under the header; the portal puts nothing here, the preview a banner. */
  banner?: React.ReactNode
  /** Rendered at the end; the portal puts the sign button here. */
  footer?: React.ReactNode
}

export function CustomerDocument({
  estimate,
  proposal,
  customer,
  organizationName,
  signed = false,
  banner,
  footer,
}: CustomerDocumentProps) {
  // Group line items by type, dropping anything not marked included — the
  // customer should never see an optional item that wasn't selected.
  const groupedLineItems =
    estimate.line_items?.reduce((acc, item) => {
      const type = item.item_type
      if (!acc[type]) acc[type] = []
      if (item.is_included) acc[type].push(item)
      return acc
    }, {} as Record<LineItemType, EstimateLineItem[]>) || {}

  const customerName =
    customer?.company_name ||
    [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
    null

  const hasSite = !!(
    estimate.site_survey?.site_address ||
    estimate.site_survey?.site_city
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {organizationName && <h1 className="text-xl font-bold">{organizationName}</h1>}
              {proposal.proposal_number && (
                <p className="text-sm text-muted-foreground">
                  Proposal {proposal.proposal_number}
                </p>
              )}
            </div>
            {signed ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                Signed
              </Badge>
            ) : (
              <Badge variant="outline">
                {proposal.status === 'viewed' ? 'Viewed' : 'Awaiting Signature'}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {banner}

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {signed && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-800">Proposal Signed Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Thank you for accepting this proposal. We will be in touch shortly to schedule
                    your project.
                  </p>
                  {proposal.signed_at && (
                    <p className="text-xs text-green-600 mt-2">
                      Signed on {new Date(proposal.signed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {proposal.cover_letter && (
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap">{proposal.cover_letter}</p>
            </CardContent>
          </Card>
        )}

        {/* Customer + site */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">{customerName ?? '—'}</p>
              {customer?.email && (
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              )}
              {customer?.phone && (
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {hasSite ? (
                <>
                  <p className="text-sm">{estimate.site_survey?.site_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      estimate.site_survey?.site_city,
                      estimate.site_survey?.site_state,
                      estimate.site_survey?.site_zip,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not specified</p>
              )}
            </CardContent>
          </Card>
        </div>

        {estimate.scope_of_work && (
          <Card>
            <CardHeader>
              <CardTitle>Scope of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{estimate.scope_of_work}</p>
            </CardContent>
          </Card>
        )}

        {proposal.inclusions && proposal.inclusions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {proposal.inclusions.map((item, idx) => (
                  <li key={idx} className="text-sm">{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(Object.entries(groupedLineItems) as [LineItemType, EstimateLineItem[]][]).map(
              ([type, items]) => (
                <div key={type}>
                  <div className="px-6 py-2 bg-muted/50">
                    <h4 className="font-medium text-sm">{LINE_ITEM_TYPE_LABELS[type]}</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: EstimateLineItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.total_price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ),
            )}

            {/* Summary */}
            <div className="px-6 py-4 bg-muted/30">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(estimate.subtotal)}</span>
                </div>
                {estimate.markup_percent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>{formatCurrency(estimate.markup_amount)}</span>
                  </div>
                )}
                {estimate.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>
                      Discount
                      {estimate.discount_percent > 0 &&
                        Number(estimate.discount_amount) > 0 &&
                        // Only show "(X%)" when the percent path drove the
                        // amount — flat-amount discounts have percent 0.
                        ` (${estimate.discount_percent}%)`}
                    </span>
                    <span>−{formatCurrency(estimate.discount_amount)}</span>
                  </div>
                )}
                {estimate.tax_percent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(estimate.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(estimate.total)}</span>
                </div>
                {estimate.discount_amount > 0 && (
                  <p className="text-xs text-green-700 text-right pt-1">
                    You&apos;re saving {formatCurrency(estimate.discount_amount)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {(estimate.estimated_duration_days || proposal.valid_until) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {estimate.estimated_duration_days && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Estimated Duration:</span>{' '}
                  {estimate.estimated_duration_days} days
                </p>
              )}
              {proposal.valid_until && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Proposal Valid Until:</span>{' '}
                  {new Date(proposal.valid_until).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {proposal.payment_terms && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{proposal.payment_terms}</p>
            </CardContent>
          </Card>
        )}

        {proposal.exclusions && proposal.exclusions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exclusions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {proposal.exclusions.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {proposal.terms_and_conditions && (
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.terms_and_conditions}
              </p>
            </CardContent>
          </Card>
        )}

        {footer}
      </main>
    </div>
  )
}
