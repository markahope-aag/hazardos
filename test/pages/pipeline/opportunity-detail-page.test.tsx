import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-123' } } }),
    },
  }),
}))

// Mock PipelineService
const mockOpportunity = {
  id: 'opp-123',
  name: 'Big Deal',
  description: 'An important opportunity',
  estimated_value: 50000,
  weighted_value: 25000,
  outcome: null,
  loss_reason: null,
  loss_notes: null,
  competitor: null,
  expected_close_date: '2024-02-15',
  actual_close_date: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  customer: {
    id: 'cust-1',
    company_name: 'Acme Corp',
  },
  owner: {
    full_name: 'John Doe',
  },
  stage: {
    name: 'Qualified',
    color: '#22c55e',
    probability: 40,
  },
  estimate_id: null,
  proposal_id: null,
  job_id: null,
}

vi.mock('@/lib/services/pipeline-service', () => ({
  PipelineService: {
    getOpportunity: (id: string) => {
      if (id === 'opp-123') return Promise.resolve(mockOpportunity)
      return Promise.resolve(null)
    },
    getStages: () => Promise.resolve([
      { id: 'stage-1', name: 'Lead', position: 1, color: '#3b82f6', probability: 10 },
      { id: 'stage-2', name: 'Qualified', position: 2, color: '#22c55e', probability: 40 },
    ]),
    getOpportunityHistory: () => Promise.resolve([
      {
        id: 'history-1',
        from_stage: { name: 'Lead', color: '#3b82f6' },
        to_stage: { name: 'Qualified', color: '#22c55e' },
        changed_by_user: { full_name: 'John Doe' },
        created_at: '2024-01-10T00:00:00Z',
        notes: null,
      },
    ]),
  },
}))

// Mock OpportunityActions component
vi.mock('@/components/pipeline/opportunity-actions', () => ({
  OpportunityActions: () => <div data-testid="opportunity-actions">Actions</div>,
}))

// Import after mocks
import OpportunityDetailPage from '@/app/(dashboard)/pipeline/[id]/page'

describe('OpportunityDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    expect(() => render(page)).not.toThrow()
  })

  it('displays opportunity name', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Big Deal')).toBeInTheDocument()
  })

  it('displays customer name', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    // Customer name appears in multiple places
    const customerNames = screen.getAllByText('Acme Corp')
    expect(customerNames.length).toBeGreaterThan(0)
  })

  it('displays opportunity details card', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Opportunity Details')).toBeInTheDocument()
    expect(screen.getByText('An important opportunity')).toBeInTheDocument()
  })

  it('displays stage information', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Stage')).toBeInTheDocument()
    expect(screen.getByText('Qualified')).toBeInTheDocument()
  })

  it('displays probability', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Probability')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('displays owner', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays value information', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Estimated Value')).toBeInTheDocument()
    expect(screen.getByText('$50,000')).toBeInTheDocument()
    expect(screen.getByText('Weighted Value')).toBeInTheDocument()
    expect(screen.getByText('$25,000')).toBeInTheDocument()
  })

  it('displays stage history', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Stage History')).toBeInTheDocument()
  })

  it('displays back link to pipeline', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    const links = screen.getAllByRole('link')
    const backLink = links.find(l => l.getAttribute('href') === '/pipeline')
    expect(backLink).toBeInTheDocument()
  })

  it('displays view customer link', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('View Customer →')).toBeInTheDocument()
  })

  it('renders opportunity actions', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByTestId('opportunity-actions')).toBeInTheDocument()
  })

  it('displays timeline information', async () => {
    const page = await OpportunityDetailPage({ params: Promise.resolve({ id: 'opp-123' }) })
    render(page)

    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })
})
