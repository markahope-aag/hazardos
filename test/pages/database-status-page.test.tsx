import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DatabaseStatusPage from '@/app/(dashboard)/database-status/page'

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

describe('DatabaseStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<DatabaseStatusPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<DatabaseStatusPage />)
    expect(screen.getByText('Database Structure Status')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<DatabaseStatusPage />)
    expect(screen.getByText(/Complete verification of Site Survey database structure/i)).toBeInTheDocument()
  })

  it('displays run full check button', () => {
    render(<DatabaseStatusPage />)
    expect(screen.getByRole('button', { name: /run full check/i })).toBeInTheDocument()
  })

  it('displays initial check message when no checks run', () => {
    render(<DatabaseStatusPage />)
    expect(screen.getByText('Database Structure Check')).toBeInTheDocument()
  })

  it('displays start button in initial state', () => {
    render(<DatabaseStatusPage />)
    expect(screen.getByRole('button', { name: /start database structure check/i })).toBeInTheDocument()
  })
})
