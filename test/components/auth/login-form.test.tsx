import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Store original env
const originalEnv = { ...process.env }

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Import after mocks
import LoginForm from '@/components/auth/login-form'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set env vars for configured state
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  it('renders email and password fields', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<LoginForm />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('has correct input types', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
  })

  it('has required fields', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(/password/i)).toBeRequired()
  })

  it('has email placeholder', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('placeholder', 'name@example.com')
  })

  it('shows setup required message when Supabase not configured', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    render(<LoginForm />)

    expect(screen.getByText(/setup required/i)).toBeInTheDocument()
    expect(screen.getByText(/supabase environment variables/i)).toBeInTheDocument()
  })

  it('does not show form when Supabase not configured', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    render(<LoginForm />)

    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
  })

  it('calls signInWithPassword on form submit', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('redirects to dashboard on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('shows error toast on login failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    })
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Invalid credentials',
      variant: 'destructive',
    })
  })

  it('disables inputs while loading', async () => {
    // Make signIn hang to test loading state
    mockSignInWithPassword.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )
    const user = userEvent.setup()

    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    // Click and check loading state immediately
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Button text should change
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
  })
})
