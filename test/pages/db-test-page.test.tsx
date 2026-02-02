import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DatabaseTestPage from '@/app/(dashboard)/db-test/page'

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    user: null,
    profile: null,
    organization: null,
    isLoading: false,
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  }),
}))

// Mock SiteSurveyService
vi.mock('@/lib/supabase/site-survey-service', () => ({
  SiteSurveyService: {
    testConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connected' }),
    createSiteSurvey: vi.fn().mockResolvedValue({ id: 'test-id' }),
    deleteSiteSurvey: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('DatabaseTestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<DatabaseTestPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText('Database Structure Test')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText(/Verify all components are properly configured/i)).toBeInTheDocument()
  })

  it('displays run tests button', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByRole('button', { name: /run tests/i })).toBeInTheDocument()
  })

  it('displays initial ready to test message', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText('Ready to Test')).toBeInTheDocument()
  })

  it('displays environment information section', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText('Environment Information')).toBeInTheDocument()
  })

  it('shows Supabase URL configured status', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText('Supabase URL:')).toBeInTheDocument()
  })

  it('shows Supabase Key configured status', () => {
    render(<DatabaseTestPage />)
    expect(screen.getByText('Supabase Key:')).toBeInTheDocument()
  })
})
