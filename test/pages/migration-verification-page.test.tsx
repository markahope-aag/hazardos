import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MigrationVerificationPage from '@/app/(dashboard)/migration-verification/page'

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
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}))

describe('MigrationVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<MigrationVerificationPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<MigrationVerificationPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Migration Verification' })).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<MigrationVerificationPage />)
    expect(screen.getByText('Verify all database migrations have been applied correctly')).toBeInTheDocument()
  })

  it('displays run full verification button', () => {
    render(<MigrationVerificationPage />)
    expect(screen.getByRole('button', { name: /run full verification/i })).toBeInTheDocument()
  })

  it('displays initial verification message', () => {
    render(<MigrationVerificationPage />)
    expect(screen.getByText(/Run a comprehensive verification/i)).toBeInTheDocument()
  })

  it('displays start migration verification button in initial state', () => {
    render(<MigrationVerificationPage />)
    expect(screen.getByRole('button', { name: /start migration verification/i })).toBeInTheDocument()
  })
})
