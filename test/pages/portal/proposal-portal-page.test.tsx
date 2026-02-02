import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProposalPortalPage from '@/app/portal/proposal/[token]/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'test-token' }),
}))

// Mock fetch to return loading state
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ProposalPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch to never resolve (stay in loading)
    mockFetch.mockReturnValue(new Promise(() => {}))
  })

  it('renders without crashing', () => {
    expect(() => render(<ProposalPortalPage />)).not.toThrow()
  })

  it('displays loading state initially', () => {
    render(<ProposalPortalPage />)
    expect(screen.getByText('Loading proposal...')).toBeInTheDocument()
  })
})

describe('ProposalPortalPage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Proposal not found' }),
    })
  })

  it('displays error state when proposal fails to load', async () => {
    render(<ProposalPortalPage />)
    // Wait for error to display
    expect(await screen.findByText('Error Loading Proposal')).toBeInTheDocument()
  })
})
