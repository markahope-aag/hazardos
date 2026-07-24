import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpportunityActions } from '@/components/pipeline/opportunity-actions'
import type { Opportunity, PipelineStage } from '@/types/sales'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock lossReasons
vi.mock('@/types/sales', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    lossReasons: ['Price', 'Competition', 'Timeline', 'Other'],
  }
})

const mockStages: PipelineStage[] = [
  { id: 'stage-1', organization_id: 'org-1', name: 'Lead', sort_order: 0, stage_type: 'lead', probability: 10, color: '#3b82f6', is_active: true, created_at: '' },
  { id: 'stage-2', organization_id: 'org-1', name: 'Proposal', sort_order: 1, stage_type: 'proposal', probability: 50, color: '#8b5cf6', is_active: true, created_at: '' },
  { id: 'stage-won', organization_id: 'org-1', name: 'Won', sort_order: 2, stage_type: 'won', probability: 100, color: '#22c55e', is_active: true, created_at: '' },
  { id: 'stage-lost', organization_id: 'org-1', name: 'Lost', sort_order: 3, stage_type: 'lost', probability: 0, color: '#ef4444', is_active: true, created_at: '' },
]

const mockOpenOpportunity: Opportunity = {
  id: 'opp-1',
  organization_id: 'org-1',
  customer_id: 'cust-1',
  company_id: null,
  name: 'Test Opportunity',
  description: null,
  stage_id: 'stage-1',
  opportunity_status: null,
  estimated_value: 10000,
  weighted_value: 5000,
  probability_pct: 50,
  expected_close_date: '2026-03-01',
  actual_close_date: null,
  primary_contact_id: null,
  site_contact_id: null,
  owner_id: null,
  property_id: null,
  service_address_line1: null,
  service_address_line2: null,
  service_city: null,
  service_state: null,
  service_zip: null,
  property_type: null,
  property_age: null,
  location_id: null,
  hazard_types: null,
  estimated_affected_area_sqft: null,
  urgency: null,
  regulatory_trigger: null,
  assessment_date: null,
  estimate_sent_date: null,
  follow_up_date: null,
  estimate_id: null,
  proposal_id: null,
  job_id: null,
  created_from_assessment_id: null,
  outcome: null,
  loss_reason: null,
  loss_notes: null,
  competitor: null,
  lost_to_competitor: null,
  lead_source: null,
  lead_source_detail: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  first_touch_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockClosedOpportunity: Opportunity = {
  ...mockOpenOpportunity,
  outcome: 'won',
}

describe('OpportunityActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })

  it('renders Move Stage button for open opportunity', () => {
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    expect(screen.getByRole('button', { name: /move stage/i })).toBeInTheDocument()
  })

  it('renders Mark Won button for open opportunity', () => {
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    expect(screen.getByRole('button', { name: /mark won/i })).toBeInTheDocument()
  })

  it('does not render Move Stage button for closed opportunity', () => {
    render(<OpportunityActions opportunity={mockClosedOpportunity} stages={mockStages} />)

    expect(screen.queryByRole('button', { name: /move stage/i })).not.toBeInTheDocument()
  })

  it('does not render Mark Won button for closed opportunity', () => {
    render(<OpportunityActions opportunity={mockClosedOpportunity} stages={mockStages} />)

    expect(screen.queryByRole('button', { name: /mark won/i })).not.toBeInTheDocument()
  })

  it('renders more options dropdown', () => {
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument()
  })

  it('opens move dialog when Move Stage is clicked', async () => {
    const user = userEvent.setup()
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    await user.click(screen.getByRole('button', { name: /move stage/i }))

    expect(screen.getByRole('heading', { name: 'Move to Stage' })).toBeInTheDocument()
  })

  it('calls API when Mark Won is clicked', async () => {
    const user = userEvent.setup()
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    await user.click(screen.getByRole('button', { name: /mark won/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/pipeline/opp-1/move',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('stage-won'),
      })
    )
  })

  it('shows success toast after marking won', async () => {
    const user = userEvent.setup()
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    await user.click(screen.getByRole('button', { name: /mark won/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Congratulations!',
      })
    )
  })

  it('refreshes router after successful action', async () => {
    const user = userEvent.setup()
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    await user.click(screen.getByRole('button', { name: /mark won/i }))

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup()
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false })
    render(<OpportunityActions opportunity={mockOpenOpportunity} stages={mockStages} />)

    await user.click(screen.getByRole('button', { name: /mark won/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        variant: 'destructive',
      })
    )
  })
})
