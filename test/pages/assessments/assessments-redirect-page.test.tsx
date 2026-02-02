import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import AssessmentsRedirectPage from '@/app/(dashboard)/assessments/page'

// Mock next/navigation
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}))

describe('AssessmentsRedirectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<AssessmentsRedirectPage />)).not.toThrow()
  })

  it('displays redirecting heading', () => {
    render(<AssessmentsRedirectPage />)
    expect(screen.getByText('Redirecting...')).toBeInTheDocument()
  })

  it('displays explanation message', () => {
    render(<AssessmentsRedirectPage />)
    expect(screen.getByText(/Assessments are now called Site Surveys/i)).toBeInTheDocument()
  })

  it('redirects to site-surveys on mount', () => {
    render(<AssessmentsRedirectPage />)
    expect(mockReplace).toHaveBeenCalledWith('/site-surveys')
  })
})
