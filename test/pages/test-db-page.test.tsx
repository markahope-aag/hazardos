import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TestDbPage from '@/app/(dashboard)/test-db/page'

// Mock DatabaseService
vi.mock('@/lib/supabase/database', () => ({
  DatabaseService: {
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      message: 'Connection successful',
    }),
  },
}))

describe('TestDbPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<TestDbPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<TestDbPage />)
    expect(screen.getByText('Database Test')).toBeInTheDocument()
  })

  it('displays page description', () => {
    render(<TestDbPage />)
    expect(screen.getByText(/Test the Supabase database connection/i)).toBeInTheDocument()
  })

  it('displays connection status card', () => {
    render(<TestDbPage />)
    expect(screen.getByText('Connection Status')).toBeInTheDocument()
  })

  it('displays test connection button', async () => {
    render(<TestDbPage />)
    // Button shows "Test Connection" after loading, or "Testing..." during loading
    expect(await screen.findByRole('button', { name: /test connection/i })).toBeInTheDocument()
  })

  it('displays database setup card', () => {
    render(<TestDbPage />)
    expect(screen.getByText('Database Setup')).toBeInTheDocument()
  })

  it('displays environment check card', () => {
    render(<TestDbPage />)
    expect(screen.getByText('Environment Check')).toBeInTheDocument()
  })

  it('shows Supabase URL environment variable status', () => {
    render(<TestDbPage />)
    expect(screen.getByText('NEXT_PUBLIC_SUPABASE_URL:')).toBeInTheDocument()
  })

  it('shows Supabase anon key environment variable status', () => {
    render(<TestDbPage />)
    expect(screen.getByText('NEXT_PUBLIC_SUPABASE_ANON_KEY:')).toBeInTheDocument()
  })
})
