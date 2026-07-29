import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithClient } from '@/test/helpers/render-with-client'
import { CustomerDocument } from '@/components/proposals/customer-document'
import type { EstimateLineItem } from '@/types/estimates'

// This component is what the customer sees, rendered by BOTH the proposal
// portal and the staff preview. The point of sharing it is that the two
// cannot drift, so these tests pin the behaviour the customer depends on.

const lineItem = (over: Partial<EstimateLineItem> = {}): EstimateLineItem =>
  ({
    id: over.id ?? 'li-1',
    estimate_id: 'est-1',
    item_type: 'labor',
    category: null,
    description: 'Certified abatement crew',
    quantity: 10,
    unit: 'hour',
    unit_price: 78,
    total_price: 780,
    sort_order: 0,
    is_optional: false,
    is_included: true,
    notes: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...over,
  }) as EstimateLineItem

const baseEstimate = {
  subtotal: 1000,
  markup_percent: 0,
  markup_amount: 0,
  discount_percent: 0,
  discount_amount: 0,
  tax_percent: 0,
  tax_amount: 0,
  total: 1000,
  line_items: [lineItem()],
}

describe('CustomerDocument', () => {
  it('shows the organisation and proposal number in the header', () => {
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{ proposal_number: 'PRO-2026-2017' }}
        organizationName="Summit Abatement Services"
      />,
    )
    expect(screen.getByText('Summit Abatement Services')).toBeInTheDocument()
    expect(screen.getByText(/PRO-2026-2017/)).toBeInTheDocument()
  })

  it('hides line items that were not included', () => {
    // An optional item the customer did not select must never appear —
    // showing it would imply they are being charged for it.
    renderWithClient(
      <CustomerDocument
        estimate={{
          ...baseEstimate,
          line_items: [
            lineItem({ id: 'in', description: 'Included work' }),
            lineItem({ id: 'out', description: 'Excluded extra', is_included: false }),
          ],
        }}
        proposal={{}}
      />,
    )
    expect(screen.getByText('Included work')).toBeInTheDocument()
    expect(screen.queryByText('Excluded extra')).not.toBeInTheDocument()
  })

  it('groups line items under their type heading', () => {
    renderWithClient(
      <CustomerDocument
        estimate={{
          ...baseEstimate,
          line_items: [
            lineItem({ id: 'a', item_type: 'labor', description: 'Crew' }),
            lineItem({ id: 'b', item_type: 'disposal', description: 'Manifested disposal' }),
          ],
        }}
        proposal={{}}
      />,
    )
    expect(screen.getByText('Labor')).toBeInTheDocument()
    expect(screen.getByText('Disposal')).toBeInTheDocument()
  })

  it('omits proposal-only sections when no proposal exists yet', () => {
    // The preview has to work before anything has been sent — that's when
    // the office is usually asked what the customer will see.
    renderWithClient(<CustomerDocument estimate={baseEstimate} proposal={{}} />)
    expect(screen.queryByText('Terms and Conditions')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment Terms')).not.toBeInTheDocument()
    expect(screen.queryByText("What's Included")).not.toBeInTheDocument()
    // Pricing is estimate-derived, so it still renders.
    expect(screen.getByText('Pricing Details')).toBeInTheDocument()
  })

  it('renders proposal sections when they are present', () => {
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{
          cover_letter: 'Thank you for the opportunity.',
          inclusions: ['Clearance testing'],
          exclusions: ['Reinstatement'],
          payment_terms: '30% deposit',
          terms_and_conditions: 'Standard terms apply.',
        }}
      />,
    )
    expect(screen.getByText('Thank you for the opportunity.')).toBeInTheDocument()
    expect(screen.getByText('Clearance testing')).toBeInTheDocument()
    expect(screen.getByText('Reinstatement')).toBeInTheDocument()
    expect(screen.getByText('30% deposit')).toBeInTheDocument()
    expect(screen.getByText('Standard terms apply.')).toBeInTheDocument()
  })

  it('prefers the company name over the personal name', () => {
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{}}
        customer={{ company_name: 'Alpine Ridge HOA', first_name: 'Ray', last_name: 'Okonkwo' }}
      />,
    )
    expect(screen.getByText('Alpine Ridge HOA')).toBeInTheDocument()
  })

  it('falls back to the personal name when there is no company', () => {
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{}}
        customer={{ first_name: 'Gregory', last_name: 'Hahn' }}
      />,
    )
    expect(screen.getByText('Gregory Hahn')).toBeInTheDocument()
  })

  it('says the site is unspecified rather than rendering a blank block', () => {
    renderWithClient(<CustomerDocument estimate={baseEstimate} proposal={{}} />)
    expect(screen.getByText('Not specified')).toBeInTheDocument()
  })

  it('shows the site address when the survey carries one', () => {
    renderWithClient(
      <CustomerDocument
        estimate={{
          ...baseEstimate,
          site_survey: {
            site_address: '1180 Jasmine Street',
            site_city: 'Denver',
            site_state: 'CO',
            site_zip: '80220',
          },
        }}
        proposal={{}}
      />,
    )
    expect(screen.getByText('1180 Jasmine Street')).toBeInTheDocument()
    expect(screen.getByText(/Denver CO 80220/)).toBeInTheDocument()
  })

  it('only shows the discount line when there is a discount', () => {
    const { unmount } = renderWithClient(
      <CustomerDocument estimate={baseEstimate} proposal={{}} />,
    )
    expect(screen.queryByText('Discount')).not.toBeInTheDocument()
    unmount()

    renderWithClient(
      <CustomerDocument
        estimate={{ ...baseEstimate, discount_percent: 10, discount_amount: 100, total: 900 }}
        proposal={{}}
      />,
    )
    expect(screen.getByText(/Discount/)).toBeInTheDocument()
    expect(screen.getByText(/You're saving/)).toBeInTheDocument()
  })

  it('reports signed state rather than awaiting signature', () => {
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{ signed_at: '2026-07-02T10:00:00Z' }}
        signed
      />,
    )
    expect(screen.getByText('Signed')).toBeInTheDocument()
    expect(screen.getByText('Proposal Signed Successfully')).toBeInTheDocument()
    expect(screen.queryByText('Awaiting Signature')).not.toBeInTheDocument()
  })

  it('renders the caller-supplied banner and footer', () => {
    // The portal passes its sign button as a footer; the preview passes a
    // staff banner. Neither may leak into the other.
    renderWithClient(
      <CustomerDocument
        estimate={baseEstimate}
        proposal={{}}
        banner={<div>PREVIEW BANNER</div>}
        footer={<div>SIGN HERE</div>}
      />,
    )
    expect(screen.getByText('PREVIEW BANNER')).toBeInTheDocument()
    expect(screen.getByText('SIGN HERE')).toBeInTheDocument()
  })
})
