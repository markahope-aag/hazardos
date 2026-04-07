import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnboardPage from '@/app/onboard/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock the Logo component
vi.mock('@/components/ui/logo', () => ({
  LogoVertical: ({ size }: { size: string }) => (
    <div data-testid="logo" data-size={size}>Logo</div>
  ),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  formatError: vi.fn((e: unknown) => String(e)),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      }),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'org-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  }),
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('OnboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    expect(() => render(<OnboardPage />)).not.toThrow()
  })

  it('displays welcome heading after user loads', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Welcome to HazardOS')).toBeInTheDocument()
    })
  })

  it('displays logo after user loads', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('logo')).toBeInTheDocument()
    })
  })

  it('displays organization creation title', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument()
    })
  })

  it('displays organization information section', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Organization Information')).toBeInTheDocument()
    })
  })

  it('renders company name input', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    })
  })

  it('renders license number input', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByLabelText(/license number/i)).toBeInTheDocument()
    })
  })

  it('renders address inputs', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByLabelText(/^address$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
    })
  })

  it('displays submit button', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument()
    })
  })

  it('displays sign in as different user option', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/sign in as a different user/i)).toBeInTheDocument()
    })
  })

  it('updates company name input on change', async () => {
    render(<OnboardPage />)
    await waitFor(() => {
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    })
    const input = screen.getByLabelText(/company name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Test Company' } })
    expect(input.value).toBe('Test Company')
  })

  it('shows loading state initially', () => {
    render(<OnboardPage />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
