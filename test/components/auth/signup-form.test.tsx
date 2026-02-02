import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignupForm } from '@/components/auth/signup-form'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock toast
const mockToast = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
  },
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({ error: null }),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock environment variables
const originalEnv = process.env

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should render signup form when Supabase is configured', () => {
    render(<SignupForm />)
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should show setup message when Supabase is not configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    
    render(<SignupForm />)
    
    expect(screen.getByText(/setup required/i)).toBeInTheDocument()
    expect(screen.getByText(/supabase environment variables are not configured/i)).toBeInTheDocument()
  })

  it('should validate that passwords match', async () => {
    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
    })
  })

  it('should validate password strength', async () => {
    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: '123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      })
    })
  })

  it('should create account successfully', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'john@example.com' },
        session: null,
      },
      error: null,
    })

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe',
          },
        },
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Account created!',
      description: 'Please check your email to verify your account.',
    })

    expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
  })

  it('should handle signup error', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Email already registered' },
    })

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Email already registered',
        variant: 'destructive',
      })
    })
  })

  it('should show loading state during submission', async () => {
    mockSupabaseClient.auth.signUp.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
    })
  })

  it('should validate required fields', async () => {
    render(<SignupForm />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    // Form should not submit without required fields
    expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
  })

  it('should validate email format', async () => {
    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    // HTML5 email validation should prevent submission
    expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
  })

  it('should handle profile creation error', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'john@example.com' },
        session: null,
      },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValueOnce({ error: { message: 'Profile creation failed' } }),
    })

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Profile creation failed',
        variant: 'destructive',
      })
    })
  })

  it('should trim whitespace from form fields', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'john@example.com' },
        session: null,
      },
      error: null,
    })

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: '  John  ' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: '  Doe  ' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: '  john@example.com  ' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe',
          },
        },
      })
    })
  })

  it('should have proper form accessibility', () => {
    render(<SignupForm />)
    
    // All form fields should have proper labels
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    
    // Submit button should be properly labeled
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should handle network errors gracefully', async () => {
    mockSupabaseClient.auth.signUp.mockRejectedValueOnce(new Error('Network error'))

    render(<SignupForm />)
    
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      })
    })
  })
})