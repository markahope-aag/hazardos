import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeedbackSurveyPage from '@/app/(public)/feedback/[token]/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'test-token' }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('FeedbackSurveyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch to never resolve (stay in loading)
    mockFetch.mockReturnValue(new Promise(() => {}))
  })

  it('renders without crashing', () => {
    expect(() => render(<FeedbackSurveyPage />)).not.toThrow()
  })

  it('displays loading state initially', () => {
    render(<FeedbackSurveyPage />)
    // Loading state shows a spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

describe('FeedbackSurveyPage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Survey not found' }),
    })
  })

  it('displays error state when survey not found', async () => {
    render(<FeedbackSurveyPage />)
    expect(await screen.findByText('Survey Not Available')).toBeInTheDocument()
  })
})

describe('FeedbackSurveyPage - Loaded State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        organization_name: 'Test Company',
        job_number: 'JOB-001',
        status: 'pending',
      }),
    })
  })

  it('displays organization name when loaded', async () => {
    render(<FeedbackSurveyPage />)
    expect(await screen.findByText('Test Company')).toBeInTheDocument()
  })

  it('displays job number when loaded', async () => {
    render(<FeedbackSurveyPage />)
    expect(await screen.findByText(/JOB-001/)).toBeInTheDocument()
  })

  it('displays overall experience section', async () => {
    render(<FeedbackSurveyPage />)
    expect(await screen.findByText('Overall Experience *')).toBeInTheDocument()
  })

  it('displays submit feedback button', async () => {
    render(<FeedbackSurveyPage />)
    expect(await screen.findByRole('button', { name: /submit feedback/i })).toBeInTheDocument()
  })
})
