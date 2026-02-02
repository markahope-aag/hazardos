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
  { id: 'stage-1', organization_id: 'org-1', name: 'Lead', position: 0, stage_type: 'active', color: '#3b82f6', created_at: '', updated_at: '' },
  { id: 'stage-2', organization_id: 'org-1', name: 'Proposal', position: 1, stage_type: 'active', color: '#8b5cf6', created_at: '', updated_at: '' },
  { id: 'stage-won', organization_id: 'org-1', name: 'Won', position: 2, stage_type: 'won', color: '#22c55e', created_at: '', updated_at: '' },
  { id: 'stage-lost', organization_id: 'org-1', name: 'Lost', position: 3, stage_type: 'lost', color: '#ef4444', created_at: '', updated_at: '' },
]

const mockOpenOpportunity: Opportunity = {
  id: 'opp-1',
  organization_id: 'org-1',
  stage_id: 'stage-1',
  customer_id: 'cust-1',
  name: 'Test Opportunity',
  value: 10000,
  probability: 50,
  expected_close_date: '2026-03-01',
  outcome: null,
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

    expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // IconButton
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
