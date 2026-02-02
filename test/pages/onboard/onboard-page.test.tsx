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

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
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

  it('displays welcome heading', () => {
    render(<OnboardPage />)
    expect(screen.getByText('Welcome to HazardOS')).toBeInTheDocument()
  })

  it('displays logo', () => {
    render(<OnboardPage />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('displays organization creation title', () => {
    render(<OnboardPage />)
    expect(screen.getByText('Create Your Organization')).toBeInTheDocument()
  })

  it('displays organization information section', () => {
    render(<OnboardPage />)
    expect(screen.getByText('Organization Information')).toBeInTheDocument()
  })

  it('displays admin user account section', () => {
    render(<OnboardPage />)
    expect(screen.getByText('Admin User Account')).toBeInTheDocument()
  })

  it('renders company name input', () => {
    render(<OnboardPage />)
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
  })

  it('renders license number input', () => {
    render(<OnboardPage />)
    expect(screen.getByLabelText(/license number/i)).toBeInTheDocument()
  })

  it('renders address inputs', () => {
    render(<OnboardPage />)
    expect(screen.getByLabelText(/^address$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
  })

  it('renders user account inputs', () => {
    render(<OnboardPage />)
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('displays sign in link', () => {
    render(<OnboardPage />)
    const signInLink = screen.getByText('Sign in here')
    expect(signInLink).toBeInTheDocument()
    expect(signInLink.closest('a')).toHaveAttribute('href', '/login')
  })

  it('displays submit button', () => {
    render(<OnboardPage />)
    expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument()
  })

  it('updates company name input on change', () => {
    render(<OnboardPage />)
    const input = screen.getByLabelText(/company name/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Test Company' } })
    expect(input.value).toBe('Test Company')
  })

  it('updates email input on change', () => {
    render(<OnboardPage />)
    const input = screen.getByLabelText(/your email address/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    expect(input.value).toBe('test@example.com')
  })
})
